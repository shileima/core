import { Autowired } from '@opensumi/di';
import {
  ComponentContribution,
  ComponentRegistry,
  ComponentRegistryInfo,
  SlotLocation,
  SlotRendererContribution,
  SlotRendererRegistry,
  CommandRegistry,
} from '@opensumi/ide-core-browser';
import { Domain } from '@opensumi/ide-core-common';
import { IMessageService } from '@opensumi/ide-overlay';

import { PROJECT_COMMANDS } from '../common';

import { HeaderTop } from './header-top.view';
import { TopSlotRenderer } from './top-slot';

@Domain(ComponentContribution)
export class TestContribution implements ComponentContribution {
  @Autowired(IMessageService)
  private messageService: IMessageService;

  /**
   * 注册组件
   * @param registry 组件注册器
   */
  registerComponent(registry: ComponentRegistry) {
    registry.register(
      'test-toolbar',
      [
        {
          id: 'test-toolbar',
          component: HeaderTop,
          name: '测试',
        },
      ],
      {
        containerId: 'test-toolbar',
      },
    );
  }

  registerCommands(registry: CommandRegistry) {
    registry.registerCommand(PROJECT_COMMANDS.CREATE_PROJECT, {
      execute: () => {
        this.messageService.info('CREATE_PROJECT');
      },
    });
  }
}

// 通过 SlotRendererContribution 替换顶部的 SlotRenderer，将默认的上下平铺模式改成横向的 flex 模式：
@Domain(SlotRendererContribution)
export class TestToolbarSlotContribution implements SlotRendererContribution {
  /**
   * 注册 SlotRenderer
   * @param registry SlotRenderer 注册器
   */
  registerRenderer(registry: SlotRendererRegistry) {
    registry.registerSlotRenderer(SlotLocation.top, TopSlotRenderer);
  }
}
