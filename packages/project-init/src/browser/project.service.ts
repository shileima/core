import { Autowired, Injectable } from '@opensumi/di';
import { RPCService } from '@opensumi/ide-connection/lib/common/proxy';
import { Emitter, IContextKeyService, IQuickInputService } from '@opensumi/ide-core-browser';
import { AbstractContextMenuService, ICtxMenuRenderer } from '@opensumi/ide-core-browser/lib/menu/next';
import { URI } from '@opensumi/ide-core-common';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { IMessageService } from '@opensumi/ide-overlay';

import { IProjectInitProps } from '../common';

const COMPONENTS_SCHEME_ID = 'project-init';

@Injectable()
export class ProjectService extends RPCService implements IProjectInitProps {
  @Autowired(IMessageService)
  private readonly messageService: IMessageService;

  // 声明编辑器窗口服务
  @Autowired(WorkbenchEditorService)
  protected readonly editorService: WorkbenchEditorService;

  private onDidCreateEmitter: any = new Emitter();

  get onDidProjectEvent() {
    return this.onDidCreateEmitter.event;
  }

  // 打开编辑器main区域tab, 展示todos
  openProject = () => {
    // this.messageService.info(`open project`);
    this.editorService.open(new URI(`${COMPONENTS_SCHEME_ID}://`), { preview: false });
    // 延迟切换item, 避免tab还未打开就切换item
    setTimeout(() => this.onDidCreateEmitter.fire('open'), 100);
  };

  createProject = () => {
    this.editorService.open(new URI(`${COMPONENTS_SCHEME_ID}://`), { preview: false });
    // 延迟切换item, 避免tab还未打开就切换item
    setTimeout(() => this.onDidCreateEmitter.fire('create'), 100);
  };

  // 接收后端消息
  onMessage = (message: string) => {
    this.messageService.info(message);
  };

  handleContextMenu = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    ev.preventDefault();

    const { x, y } = ev.nativeEvent;
  };
}
