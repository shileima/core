import { ITheme, ThemeType, ColorIdentifier, getBuiltinRules, getThemeType, ThemeContribution, IColors, IColorMap, ThemeInfo, IThemeService, ExtColorContribution, ThemeMix, getThemeId, IThemeData, getThemeTypeSelector } from '../common/theme.service';
import { WithEventBus, localize, Emitter, Event } from '@ali/ide-core-common';
import { Autowired, Injectable } from '@ali/common-di';
import { getColorRegistry } from '../common/color-registry';
import { Color, IThemeColor } from '../common/color';
import { ThemeChangedEvent } from '../common/event';
import { ThemeData } from './theme-data';
import { ThemeStore } from './theme-store';
import { Logger, getPreferenceThemeId, PreferenceService, PreferenceSchemaProvider, IPreferenceSettingsService } from '@ali/ide-core-browser';
import { Registry } from 'vscode-textmate';

const DEFAULT_THEME_ID = 'vs-dark vscode-theme-defaults-themes-dark_plus-json';
// from vscode
const colorIdPattern = '^\\w+[.\\w+]*$';

@Injectable()
export class WorkbenchThemeService extends WithEventBus implements IThemeService {

  private colorRegistry = getColorRegistry();

  // TODO 初始化时读取本地存储配置
  private currentThemeId;
  private currentTheme: Theme;

  private themes: Map<string, ThemeData> = new Map();
  private themeContributionRegistry: Map<string, {contribution: ThemeContribution, basePath: string}> = new Map();

  private themeChangeEmitter: Emitter<ITheme> = new Emitter();

  public onThemeChange: Event<ITheme> = this.themeChangeEmitter.event;

  @Autowired()
  private themeStore: ThemeStore;

  @Autowired()
  private logger: Logger;

  @Autowired(PreferenceService)
  private preferenceService: PreferenceService;

  @Autowired(PreferenceSchemaProvider)
  private preferenceSchemaProvider: PreferenceSchemaProvider;

  @Autowired(IPreferenceSettingsService)
  private preferenceSettings: IPreferenceSettingsService;

  constructor() {
    super();
    this.listen();
  }

  public registerThemes(themeContributions: ThemeContribution[], extPath: string) {
    themeContributions.forEach((contribution) => {
      const themeExtContribution = { basePath: extPath, contribution };
      this.themeContributionRegistry.set(getThemeId(contribution), themeExtContribution);
      this.preferenceSchemaProvider.setSchema({
        properties: {
          'general.theme': {
            type: 'string',
            default: 'vs-dark',
            enum: this.getAvailableThemeInfos().map((info) => info.themeId),
            description: '%preference.description.general.theme%',
          },
        },
      }, true);
      const map = {};
      this.getAvailableThemeInfos().forEach((info) => {
        map[info.themeId] = info.name;
      });
      this.preferenceSettings.setEnumLabels('general.theme', map);
    });
  }

  public async applyTheme(themeId: string) {
    if (!themeId) {
      themeId = getPreferenceThemeId();
    }
    const existedTheme = this.getAvailableThemeInfos().find((info) => info.themeId === themeId);
    if (!existedTheme) {
      themeId = DEFAULT_THEME_ID;
    }
    if (this.currentThemeId === themeId) {
      return;
    }
    this.currentThemeId = themeId;
    const theme = await this.getTheme(themeId);
    const themeType = getThemeType(theme.base);
    this.currentTheme = new Theme(themeType, theme);
    this.useUITheme(this.currentTheme);
    this.eventBus.fire(new ThemeChangedEvent({
      theme: this.currentTheme,
    }));
  }

  // TODO 插件机制需要支持 contribution 增/减量，来做deregister
  public registerColor(contribution: ExtColorContribution) {
    if (!this.checkColorContribution(contribution)) {
      return;
    }
    const { defaults } = contribution;
    this.colorRegistry.registerColor(contribution.id, {
      light: this.parseColorValue(defaults.light, 'configuration.colors.defaults.light'),
      dark: this.parseColorValue(defaults.dark, 'configuration.colors.defaults.dark'),
      hc: this.parseColorValue(defaults.highContrast, 'configuration.colors.defaults.highContrast'),
    }, contribution.description);
  }

  // @deprecated 请直接使用sync方法，主题加载由时序保障
  public async getCurrentTheme() {
    if (this.currentTheme) {
      return this.currentTheme;
    } else {
      const themeData = await this.getTheme(this.currentThemeId);
      return new Theme(getThemeType(themeData.base), themeData);
    }
  }

  // 正常情况下请使用getCurrentTheme方法，当前主题未加载时，会使用默认的主题而不会主动激活主题
  public getCurrentThemeSync() {
    if (this.currentTheme) {
      return this.currentTheme;
    } else {
      const themeData = this.themeStore.loadDefaultTheme();
      return new Theme(getThemeType(themeData.base), themeData);
    }
  }

  public getColor(colorId: string | IThemeColor | undefined): string | undefined {
    if (!colorId) {
      return undefined;
    }
    if (typeof colorId === 'string') {
      return colorId;
    }
    const color = this.currentTheme.getColor(colorId.id);
    return color ? Color.Format.CSS.formatHexA(color) : '';
  }

  // 将 colorId 转换成 css 变量
  public getColorVar(colorId: string | IThemeColor | undefined): string | undefined {
    if (!colorId) {
      return undefined;
    }
    const colorKey = typeof colorId === 'string' ? colorId : colorId.id;
    return colorKey ? `var(--${colorKey.replace(/\./g, '-')})` : undefined;
  }

  // TODO 前台缓存
  public getAvailableThemeInfos(): ThemeInfo[] {
    const themeInfos: ThemeInfo[] = [];
    for (const {contribution} of this.themeContributionRegistry.values()) {
      const {
        label,
        uiTheme,
      } = contribution;
      themeInfos.push({
        themeId: getThemeId(contribution),
        name: label,
        base: uiTheme,
      });
    }
    return themeInfos;
  }

  private listen() {
    this.eventBus.on(ThemeChangedEvent, (e) => {
      this.themeChangeEmitter.fire( e.payload.theme);
    });
    this.preferenceService.onPreferenceChanged( (e) => {
      if (e.preferenceName === 'general.theme') {
        this.applyTheme(this.preferenceService.get<string>('general.theme')!);
      }
    });
  }

  private checkColorContribution(contribution: ExtColorContribution) {
    if (typeof contribution.id !== 'string' || contribution.id.length === 0) {
      this.logger.error(localize('invalid.id', "'configuration.colors.id' must be defined and can not be empty"));
      return false;
    }
    if (!contribution.id.match(colorIdPattern)) {
      this.logger.error(localize('invalid.id.format', "'configuration.colors.id' must follow the word[.word]*"));
      return false;
    }
    if (typeof contribution.description !== 'string' || contribution.id.length === 0) {
      this.logger.error(localize('invalid.description', "'configuration.colors.description' must be defined and can not be empty"));
      return false;
    }
    const defaults = contribution.defaults;
    if (!defaults || typeof defaults !== 'object' || typeof defaults.light !== 'string' || typeof defaults.dark !== 'string' || typeof defaults.highContrast !== 'string') {
      this.logger.error(localize('invalid.defaults', "'configuration.colors.defaults' must be defined and must contain 'light', 'dark' and 'highContrast'"));
      return false;
    }
    return true;
  }

  private parseColorValue = (s: string, name: string) => {
    if (s.length > 0) {
      if (s[0] === '#') {
        return Color.Format.CSS.parseHex(s);
      } else {
        return s;
      }
    }
    this.logger.error(localize('invalid.default.colorType', '{0} must be either a color value in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of a themable color which provides the default.', name));
    return Color.red;
  }

  private async getTheme(id: string): Promise<IThemeData> {
    const theme = this.themes.get(id);
    if (theme) {
      return theme;
    }
    const themeInfo = this.themeContributionRegistry.get(id);
    if (themeInfo) {
      const {contribution, basePath} = themeInfo;
      return await this.themeStore.getThemeData(contribution, basePath);
    }
    return await this.themeStore.getThemeData();
  }

  private useUITheme(theme: Theme) {
    const colorContributions = this.colorRegistry.getColors();
    const colors = {};
    colorContributions.forEach((contribution) => {
      const colorId = contribution.id;
      const color = theme.getColor(colorId);
      colors[colorId] = color ? color.toString() : '';
    });
    // 添加一些额外计算出的颜色
    const foreground = theme.getColor('foreground');
    if (foreground) {
      colors['foreground.secondary'] = foreground.darken(0.2).toString();
    }
    if (theme.getColor('menu.foreground')) {
      colors['menu.foreground.disabled'] = theme.getColor('menu.foreground')!.darken(0.4).toString();
    }

    let cssVariables = ':root{';
    for (const colorKey of Object.keys(colors)) {
      const targetColor = colors[colorKey] || theme.getColor(colorKey);
      if (targetColor) {
        const hexRule = `--${colorKey.replace(/\./g, '-')}: ${targetColor.toString()};\n`;
        cssVariables += hexRule;
      }
    }
    let styleNode = document.getElementById('theme-style');
    if (styleNode) {
      styleNode.innerHTML = cssVariables + '}';
    } else {
      styleNode = document.createElement('style');
      styleNode.id = 'theme-style';
      styleNode.innerHTML = cssVariables + '}';
      document.getElementsByTagName('head')[0].appendChild(styleNode);
    }
    this.toggleBaseThemeClass(getThemeTypeSelector(theme.type));
  }

  protected toggleBaseThemeClass(themeSelector: string) {
    const bodyNode = document.getElementsByTagName('body')[0];
    bodyNode.classList.value = themeSelector;
  }
}

export class Themable extends WithEventBus {
  @Autowired(IThemeService)
  themeService: WorkbenchThemeService;

  protected theme: ITheme;

  constructor() {
    super();
    this.listenThemeChange();
  }

  get currentTheme() {
    return this.theme;
  }

  // 传入色值ID，主题色未定义时，若useDefault为false则返回undefined
  protected async getColor(id: ColorIdentifier, useDefault?: boolean) {
    if (!this.theme) {
      this.theme = await this.themeService.getCurrentTheme();
    }
    return this.theme.getColor(id, useDefault);
  }

  private listenThemeChange() {
    this.themeService.onThemeChange((theme) => {
      this.theme = theme;
      this.style();
    });
  }

  // themeChange时自动调用，首次调用时机需要模块自己判断
  async style(): Promise<void> {
    // use theme
  }
}

class Theme implements ITheme {
  readonly type: ThemeType;
  readonly themeData: IThemeData;
  private readonly colorRegistry = getColorRegistry();
  private readonly defaultColors: { [colorId: string]: Color | undefined; } = Object.create(null);

  private colorMap: IColorMap;

  constructor(type: ThemeType, themeData: IThemeData) {
    this.type = type;
    this.themeData = themeData;
    this.patchColors();
    this.patchTokenColors();
  }

  protected patchColors() {
    const colorContributions = this.colorRegistry.getColors();
    for (const colorContribution of colorContributions) {
      const id = colorContribution.id;
      const colorMap = this.themeData.colorMap;
      if (!colorMap[id]) {
        const color = this.colorRegistry.resolveDefaultColor(id, this);
        if (color) {
          colorMap[id] = color;
          this.themeData.colors[id] = Color.Format.CSS.formatHexA(color);
        }
      }
    }
  }

  // 将encodedTokensColors转为monaco可用的形式
  private patchTokenColors() {
    const reg = new Registry();
    // 当默认颜色不在settings当中时，此处不能使用之前那种直接给encodedTokenColors赋值的做法，会导致monaco使用时颜色错位（theia的bug
    if (this.themeData.settings.filter((setting) => !setting.scope).length === 0) {

      this.themeData.settings.unshift({
        settings: {
          foreground: this.themeData.colors['editor.foreground'] ? this.themeData.colors['editor.foreground'].substr(0, 7) : Color.Format.CSS.formatHexA(this.colorRegistry.resolveDefaultColor('editor.foreground', this)!), // 这里要去掉透明度信息
          background: this.themeData.colors['editor.background'] ? this.themeData.colors['editor.background'].substr(0, 7) : Color.Format.CSS.formatHexA(this.colorRegistry.resolveDefaultColor('editor.background', this)!),
        },
      });
    }
    reg.setTheme(this.themeData);
    this.themeData.encodedTokensColors = reg.getColorMap();
    // index 0 has to be set to null as it is 'undefined' by default, but monaco code expects it to be null
    // tslint:disable-next-line:no-null-keyword
    this.themeData.encodedTokensColors[0] = null!;
  }

  // 返回主题内的颜色值
  private getColors(): IColorMap {
    if (!this.colorMap) {
      const colorMap = Object.create(null);
      // tslint:disable-next-line
      for (let id in this.themeData.colorMap) {
        colorMap[id] = this.themeData.colorMap[id];
      }
      if (this.themeData.inherit) {
        const baseData = getBuiltinRules(this.themeData.base);
        for (const id in baseData.colors) {
          if (!colorMap[id]) {
            colorMap[id] = Color.fromHex(baseData.colors[id]);
          }

        }
      }
      this.colorMap = colorMap;
    }
    return this.colorMap;
  }

  getColor(colorId: ColorIdentifier, useDefault?: boolean): Color | undefined {
    const color = this.getColors()[colorId];
    if (color) {
      return color;
    }
    if (useDefault !== false) {
      return this.getDefault(colorId);
    }
    return undefined;
  }

  private getDefault(colorId: ColorIdentifier): Color | undefined {
    let color = this.defaultColors[colorId];
    if (color) {
      return color;
    }
    color = this.colorRegistry.resolveDefaultColor(colorId, this);
    this.defaultColors[colorId] = color;
    return color;
  }

  defines(color: ColorIdentifier): boolean {
    if (this.themeData.colors[color]) {
      return true;
    }
    return false;
  }
}
