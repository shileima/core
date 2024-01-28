import {
  ComponentContribution,
  ComponentRegistry,
  ComponentRegistryInfo,
  SlotLocation,
  SlotRendererContribution,
  SlotRendererRegistry,
  getIcon,
} from '@opensumi/ide-core-browser';
import { Domain } from '@opensumi/ide-core-common';

import { CustromRightView } from './index.view';

@Domain(ComponentContribution)
export class CustomRightContribution implements ComponentContribution {
  /**
   * 注册组件
   * @param registry 组件注册器
   */
  registerComponent(registry: ComponentRegistry) {
    registry.register(
      'test-left-bar',
      [],
      {
        containerId: 'test-left-bar',
        title: '元素库',
        iconClass: getIcon('setting'),
        hideTab: false,
        component: CustromRightView,
        expanded: false,
        hidden: true,
        priority: 2,
      },
      SlotLocation.left,
    );
  }
}
