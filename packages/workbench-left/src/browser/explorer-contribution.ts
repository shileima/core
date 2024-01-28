import { COMPONENTS_SCHEME_ID } from '@xbot/ide-project-init/lib/browser/project-init.contribution';

import { Autowired } from '@opensumi/di';
import { localize, Domain, getIcon, formatLocalize, ClientAppContribution } from '@opensumi/ide-core-browser';
import { SlotLocation } from '@opensumi/ide-core-browser';
import { EXPLORER_CONTAINER_ID } from '@opensumi/ide-core-browser/lib/common/container-id';
import { browserViews } from '@opensumi/ide-core-browser/lib/extensions/schema/browserViews';
import { ComponentContribution, ComponentRegistry } from '@opensumi/ide-core-browser/lib/layout';
import { IExtensionsSchemaService, URI } from '@opensumi/ide-core-common';
import { WorkbenchEditorService } from '@opensumi/ide-editor/lib/browser/types';
import { IMainLayoutService } from '@opensumi/ide-main-layout';

const WROKBENCH_CONTAINER_ID = 'workbench-container-id';

export { WROKBENCH_CONTAINER_ID };

@Domain(ClientAppContribution, ComponentContribution)
export class ExplorerContribution implements ClientAppContribution, ComponentContribution {
  @Autowired(IExtensionsSchemaService)
  protected readonly extensionsSchemaService: IExtensionsSchemaService;

  // 注册布局服务
  @Autowired(IMainLayoutService)
  private readonly layoutService: IMainLayoutService;

  /**
   * editorService 是一个注入的 WorkbenchEditorService 实例，用于处理编辑器相关的操作。
   */
  @Autowired(WorkbenchEditorService)
  protected readonly editorService: WorkbenchEditorService;

  /**
   * register `workbench` component container
   */
  registerComponent(registry: ComponentRegistry) {
    registry.register('workbench', [], {
      iconClass: getIcon('cloud-download'),
      title: '工作台',
      priority: 11,
      containerId: WROKBENCH_CONTAINER_ID,
      activateKeyBinding: 'ctrlcmd+shift+u',
    });
  }

  /**
   * Set left tab width by container ID
   */
  async setTabSize() {
    // await this.editorService.closeAll();
    const currentContainerId = this.layoutService.getTabbarService(SlotLocation.left).currentContainerId;
    if (currentContainerId === WROKBENCH_CONTAINER_ID) {
      setTimeout(() => {
        // 这里关闭后又默认打开, 延迟执行
        this.layoutService.getTabbarHandler(WROKBENCH_CONTAINER_ID)?.setSize(0);
        this.editorService.open(new URI(`${COMPONENTS_SCHEME_ID}://`), { preview: false });
        this.layoutService.toggleSlot(SlotLocation.right, false);
        // this.layoutService.toggleSlot(SlotLocation.left, false);
        this.layoutService.toggleSlot(SlotLocation.bottom, false);
      }, 0);
    } else {
      this.layoutService.getTabbarHandler(WROKBENCH_CONTAINER_ID)?.setSize(328);
    }
  }

  onStart() {
    this.setTabSize();

    // 监听视图切换事件
    this.layoutService.getTabbarHandler(WROKBENCH_CONTAINER_ID)?.onActivate(async () => this.setTabSize());
    this.layoutService.getTabbarHandler(EXPLORER_CONTAINER_ID)?.onActivate(() => this.setTabSize());

    this.extensionsSchemaService.appendExtensionPoint(['browserViews', 'properties'], {
      extensionPoint: EXPLORER_CONTAINER_ID,
      frameworkKind: ['opensumi'],
      jsonSchema: {
        ...browserViews.properties,
        description: formatLocalize('sumiContributes.browserViews.location.custom', localize('explorer.title')),
      },
    });
  }
}
