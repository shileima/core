import { Injectable, Autowired, Optinal } from '@ali/common-di';
import { IMainThreadEditorsService, IExtensionHostEditorService, ExtHostAPIIdentifier, IEditorChangeDTO, IResolvedTextEditorConfiguration, TextEditorRevealType } from '../../common';
import { WorkbenchEditorService, IEditorGroup, IResource, IEditor, IUndoStopOptions, ISingleEditOperation, EndOfLineSequence, IDecorationApplyOptions, IEditorOpenType, IResourceOpenOptions } from '@ali/ide-editor';
import { WorkbenchEditorServiceImpl } from '@ali/ide-editor/lib/browser/workbench-editor.service';
import { WithEventBus, MaybeNull, IRange, IPosition, URI, ISelection } from '@ali/ide-core-common';
import { EditorGroupOpenEvent, EditorGroupChangeEvent, IEditorDecorationCollectionService, EditorSelectionChangeEvent, EditorVisibleChangeEvent, EditorConfigurationChangedEvent, EditorGroupIndexChangedEvent } from '@ali/ide-editor/lib/browser';
import { IRPCProtocol } from '@ali/ide-connection';
import { IMonacoImplEditor } from '@ali/ide-editor/lib/browser/editor-collection.service';

@Injectable()
export class MainThreadEditorService extends WithEventBus implements IMainThreadEditorsService {
  @Autowired(WorkbenchEditorService)
  editorService: WorkbenchEditorServiceImpl;

  @Autowired(IEditorDecorationCollectionService)
  decorationService: IEditorDecorationCollectionService;

  private readonly proxy: IExtensionHostEditorService;

  constructor(@Optinal(Symbol()) private rpcProtocol: IRPCProtocol) {
    super();
    this.proxy = this.rpcProtocol.getProxy(ExtHostAPIIdentifier.ExtHostEditors);
    this.$getInitialState().then((change) => {
      this.proxy.$acceptChange(change);
    });
  }

  async $getInitialState() {
    this.startEvents();
    return {
      created: this.editorService.editorGroups.map((group) => {
        if (group.currentOpenType && isEditor(group.currentOpenType)) {
          const editor = group.currentEditor as IMonacoImplEditor;
          return {
            id: getTextEditorId(group, group.currentResource!),
            uri: group.currentResource!.uri.toString(),
            selections: editor!.getSelections() || [],
            options: getEditorOption(editor.monacoEditor),
            viewColumn: getViewColumn(group),
            visibleRanges: editor.monacoEditor.getVisibleRanges(),
          };
        }
      }).filter((c) => !!c),
    } as IEditorChangeDTO;

  }

  async $closeEditor(id: string) {
    const editor = this.getEditor(id);
    if (editor) {
      const group = this.getGroup(id)!;
      group.close(group.currentResource!.uri);
    }

  }

  async $revealRange(id: string, range: IRange, type?: TextEditorRevealType) {
    const editor = this.getEditor(id);
    if (editor) {
      switch (type) {
        case TextEditorRevealType.InCenter:
            return editor.monacoEditor.revealRangeInCenter(range);
        case TextEditorRevealType.AtTop:
            return editor.monacoEditor.revealRangeAtTop(range);
        case TextEditorRevealType.InCenterIfOutsideViewport:
            return editor.monacoEditor.revealRangeInCenterIfOutsideViewport(range);
        default:
            return editor.monacoEditor.revealRange(range);
      }

    }
  }

  async $createTextEditorDecorationType(key, options) {
    this.decorationService.createTextEditorDecorationType(options, key);
  }

  async $deleteTextEditorDecorationType(key) {
    const type = this.decorationService.getTextEditorDecorationType(key);
    if (type) {
      type.dispose();
    }
  }

  async $applyDecoration(id: string, decorationKey: string, options: IDecorationApplyOptions[]) {
    const editor = this.getEditor(id);
    if (editor) {
      editor.applyDecoration(decorationKey, options);
    }
  }

  async $insertSnippet(id: string, snippet: string, ranges: IRange[] = [], options: IUndoStopOptions = {undoStopAfter: true, undoStopBefore: true}) {
    const editor = this.getEditor(id);
    if (editor) {
      editor.insertSnippet(snippet, ranges, options );
    }
  }

  private getEditor(id: string): IMonacoImplEditor | undefined {
    const group = this.getGroup(id);
    if (!group) {
      return;
    }
    const currentResource = group.currentResource;
    if (currentResource && group.currentOpenType && isEditor(group.currentOpenType) && id === getTextEditorId(group, currentResource)) {
      return group.currentEditor as IMonacoImplEditor;
    }
  }

  private getGroup(id: string): IEditorGroup | undefined {
    const groupId = getGroupIdFromTextEditorId(id);
    const group = this.editorService.getEditorGroup(groupId);
    return group;
  }

  startEvents() {
    this.eventBus.on(EditorGroupChangeEvent, (event) => {
      const payload = event.payload;
      if (!resourceEquals(payload.newResource, payload.oldResource)) {
        const change: IEditorChangeDTO = {};
        if (payload.newOpenType && (payload.newOpenType.type === 'code' || payload.newOpenType.type === 'diff')) {
          const editor = payload.group.currentEditor as IMonacoImplEditor;
          change.created = [
            {
              id: getTextEditorId(payload.group, payload.newResource!),
              uri: payload.newResource!.uri.toString(),
              selections: editor!.getSelections() || [],
              options: getEditorOption(editor.monacoEditor),
              viewColumn: getViewColumn(payload.group),
              visibleRanges: editor.monacoEditor.getVisibleRanges(),
            },
          ];
        }
        if (payload.oldOpenType && (payload.oldOpenType.type === 'code' || payload.oldOpenType.type === 'diff')) {
          change.removed = [getTextEditorId(payload.group, payload.oldResource!)];
        }
        this.proxy.$acceptChange(change);
      }
    });
    this.editorService.onActiveResourceChange((resource) => {
      if (resource && this.editorService.currentEditorGroup && isEditor(this.editorService.currentEditorGroup.currentOpenType)) {
        this.proxy.$acceptChange({
          actived: getTextEditorId(this.editorService.currentEditorGroup, this.editorService.currentResource!),
        });
      } else {
        this.proxy.$acceptChange({
          actived: undefined,
        });
      }
    });

    this.eventBus.on(EditorSelectionChangeEvent, (e) => {
      const editorId = getTextEditorId(e.payload.group, e.payload.resource);
      this.proxy.$acceptPropertiesChange({
        id: editorId,
        selections: {
          selections: e.payload.selections,
          source: e.payload.source,
        },
      });
    });
    this.eventBus.on(EditorVisibleChangeEvent, (e) => {
      const editorId = getTextEditorId(e.payload.group, e.payload.resource);
      this.proxy.$acceptPropertiesChange({
        id: editorId,
        visibleRanges: e.payload.visibleRanges,
      });
    });
    this.eventBus.on(EditorConfigurationChangedEvent, (e) => {
      const editorId = getTextEditorId(e.payload.group, e.payload.resource);
      if (e.payload.group.currentEditor) {
        this.proxy.$acceptPropertiesChange({
          id: editorId,
          options: getEditorOption((e.payload.group.currentEditor as IMonacoImplEditor).monacoEditor),
        });
      }
    });
    this.eventBus.on(EditorGroupIndexChangedEvent, (e) => {
      if (isGroupEditorState(e.payload.group)) {
        const editorId = getTextEditorId(e.payload.group, e.payload.group.currentResource!);
        this.proxy.$acceptPropertiesChange({
          id: editorId,
          viewColumn: getViewColumn(e.payload.group),
        });
      }
    });
  }

  async $applyEdits(id: string, documentVersionId: number, edits: ISingleEditOperation[], options: { setEndOfLine: EndOfLineSequence | undefined; undoStopBefore: boolean; undoStopAfter: boolean; }): Promise<boolean> {
    const editor = this.getEditor(id);
    if (editor && editor.currentDocumentModel) {
      const model: monaco.editor.ITextModel = editor.currentDocumentModel.toEditor();
      if (model && model.getVersionId() === documentVersionId) {
        if (typeof options.setEndOfLine !== 'undefined') {
          model.pushEOL(options.setEndOfLine as any);
        }
        const transformedEdits = edits.map((edit): monaco.editor.IIdentifiedSingleEditOperation => {
          return {
            range: monaco.Range.lift(edit.range),
            text: edit.text,
            forceMoveMarkers: edit.forceMoveMarkers,
          };
        });
        if (options.undoStopBefore) {
          editor.monacoEditor.pushUndoStop();
        }
        editor.monacoEditor.executeEdits('MainThreadTextEditor', transformedEdits);
        if (options.undoStopAfter) {
          editor.monacoEditor.pushUndoStop();
        }
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async $openResource(uri: string, options: IResourceOpenOptions): Promise<string> {
    options.forceOpenType = { type: 'code' };
    const result = await this.editorService.open(new URI(uri), options);
    if (result) {
      return getTextEditorId(result.group, result.resource);
    }
    throw new Error('Editor Open uri ' + uri.toString() + ' Failed');
  }

  $setSelections(id: string, selections: ISelection[]): Promise<void>  {
    if (!this.getEditor(id)) {
      return Promise.reject(`TextEditor: ${id}`);
    }
    console.log('editor', this.getEditor(id));
    console.log('selections', selections);
    this.getEditor(id)!.setSelections(selections);
    return Promise.resolve();
  }

}

function getTextEditorId(group: IEditorGroup, resource: IResource): string {
  return group.name + '.' + resource.uri;
}

function getGroupIdFromTextEditorId(id: string): string {
  return id.substr(0, id.indexOf('.'));
}

function getEditorOption(editor: monaco.editor.ICodeEditor): IResolvedTextEditorConfiguration {
  const modelOptions = editor.getModel()!.getOptions();
  return {
    tabSize: modelOptions.tabSize,
    indentSize: modelOptions.indentSize,
    insertSpaces: modelOptions.insertSpaces,
    cursorStyle: editor.getConfiguration().viewInfo.cursorStyle,
    lineNumbers: editor.getConfiguration().viewInfo.renderLineNumbers as any,
  };
}

function isEditor(openType: MaybeNull<IEditorOpenType>): boolean {
  if (!openType) {
    return false;
  }
  return openType.type === 'code' || openType.type === 'diff';
}

function isGroupEditorState(group: IEditorGroup) {
  return group.currentOpenType && isEditor(group.currentOpenType);
}

function getViewColumn(group: IEditorGroup) {
  return group.index;
}

function resourceEquals(r1: MaybeNull<IResource>, r2: MaybeNull<IResource>) {
  if (!r1 && !r2) {
    return true;
  }
  if (r1 && r2 && r1.uri.isEqual(r2.uri)) {
    return true;
  }
  return false;
}
