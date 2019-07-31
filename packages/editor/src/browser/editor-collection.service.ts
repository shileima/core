import { Injectable, Autowired, INJECTOR_TOKEN, Injector } from '@ali/common-di';
import { URI, WithEventBus, OnEvent, Emitter as EventEmitter, Event, ISelection, Disposable } from '@ali/ide-core-common';
import { IDocumentModelManager, IDocumentModel } from '@ali/ide-doc-model/lib/common';
import { ICodeEditor, IEditor, EditorCollectionService, IDiffEditor, ResourceDecorationChangeEvent, CursorStatus, IUndoStopOptions, IDecorationApplyOptions } from '../common';
import { DocModelContentChangedEvent } from '@ali/ide-doc-model/lib/browser/event';
import { IRange, MonacoService } from '@ali/ide-core-browser';
import { MonacoEditorDecorationApplier } from './decoration-applier';

@Injectable()
export class EditorCollectionServiceImpl extends WithEventBus implements EditorCollectionService {

  @Autowired()
  private monacoService: MonacoService;

  @Autowired(INJECTOR_TOKEN)
  injector: Injector;

  @Autowired(IDocumentModelManager)
  protected documentModelManager: IDocumentModelManager;

  private collection: Map<string, ICodeEditor> = new Map();

  private _editors: Set<IMonacoImplEditor> = new Set();

  async createCodeEditor(dom: HTMLElement, options?: any): Promise<ICodeEditor> {
    const monacoCodeEditor = await this.monacoService.createCodeEditor(dom, options);
    const editor = this.injector.get(BrowserCodeEditor, [monacoCodeEditor]);
    return editor;
  }

  public async createDiffEditor(dom: HTMLElement, options?: any): Promise<import('../common').IDiffEditor> {
    const monacoDiffEditor = await this.monacoService.createDiffEditor(dom, options);
    const editor = this.injector.get(BrowserDiffEditor, [monacoDiffEditor]);
    return editor;
  }
  public listEditors(): IMonacoImplEditor[] {
    return Array.from(this._editors.values());
  }

  public addEditors(editors: IMonacoImplEditor[]) {
    const beforeSize = this._editors.size;
    console.log(editors);
    editors.forEach((editor) => {
      if (!this._editors.has(editor)) {
        this._editors.add(editor);
      }
    });
    if (this._editors.size !== beforeSize) {
      // fire event;
    }
  }

  public removeEditors(editors: IMonacoImplEditor[]) {
    const beforeSize = this._editors.size;
    editors.forEach((editor) => {
      this._editors.delete(editor);
    });
    if (this._editors.size !== beforeSize) {
      // fire event;
    }
  }

  // 将docModel的变更事件反映至resource的dirty装饰
  @OnEvent(DocModelContentChangedEvent)
  onDocModelContentChangedEvent(e: DocModelContentChangedEvent) {
    this.eventBus.fire(new ResourceDecorationChangeEvent({
      uri: e.payload.uri,
      decoration: {
        dirty: e.payload.dirty,
      },
    }));
  }

}

export interface IMonacoImplEditor extends IEditor {

  monacoEditor: monaco.editor.ICodeEditor;

}

export function insertSnippetWithMonacoEditor(editor: monaco.editor.ICodeEditor, template: string, ranges: IRange[], opts: IUndoStopOptions ) {

  const snippetController = editor.getContribution('snippetController2') as any;
  const selections: ISelection[] = ranges.map((r) => new monaco.Selection(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn));
  editor.setSelections(selections);
  editor.focus();

  snippetController.insert(template, 0, 0, opts.undoStopBefore, opts.undoStopAfter);

}

export class BrowserCodeEditor implements ICodeEditor {

  @Autowired(EditorCollectionService)
  private collectionService: EditorCollectionServiceImpl;

  @Autowired(IDocumentModelManager)
  protected documentModelManager: IDocumentModelManager;

  @Autowired(INJECTOR_TOKEN)
  injector: Injector;

  private editorState: Map<string, monaco.editor.ICodeEditorViewState> = new Map();

  private readonly toDispose: monaco.IDisposable[] = [];

  public currentUri: URI | null;

  protected _currentDocumentModel: IDocumentModel;

  private _onCursorPositionChanged = new EventEmitter<CursorStatus>();
  public onCursorPositionChanged = this._onCursorPositionChanged.event;

  public _disposed: boolean = false;

  private decorationApplier: MonacoEditorDecorationApplier;

  public get currentDocumentModel() {
    return this._currentDocumentModel;
  }

  public getId() {
    return this.monacoEditor.getId();
  }

  getSelections() {
    return this.monacoEditor.getSelections() || [];
  }

  setSelections(selections) {
    return this.monacoEditor.setSelections(selections);
  }

  setSelection(selection) {
    return this.monacoEditor.setSelection(selection);
  }

  constructor(
    public readonly monacoEditor: monaco.editor.IStandaloneCodeEditor,
  ) {
    this.collectionService.addEditors([this]);
    this.decorationApplier = this.injector.get(MonacoEditorDecorationApplier, [this.monacoEditor]);
    // 防止浏览器后退前进手势
    const disposer = monacoEditor.onDidChangeModel(() => {
      bindPreventNavigation(this.monacoEditor.getDomNode()!);
      disposer.dispose();
    });
    this.toDispose.push(monacoEditor.onDidChangeCursorPosition(() => {
      const selection = monacoEditor.getSelection();
      this._onCursorPositionChanged.fire({
        position: monacoEditor.getPosition(),
        selectionLength: selection ? this._currentDocumentModel.getText(selection).length : 0,
      });
    }));
  }

  layout(): void {
    this.monacoEditor.layout();
  }

  focus(): void {
    this.monacoEditor.focus();
  }

  insertSnippet(template: string, ranges: IRange[], opts: IUndoStopOptions ) {
    insertSnippetWithMonacoEditor(this.monacoEditor, template, ranges, opts);
  }

  dispose() {
    this.saveCurrentState();
    this.collectionService.removeEditors([this]);
    this.monacoEditor.dispose();
    this._disposed = true;
    this.toDispose.forEach((disposable) => disposable.dispose());
  }

  protected saveCurrentState() {
    if (this.currentUri) {
      const state = this.monacoEditor.saveViewState();
      if (state) {
        this.editorState.set(this.currentUri.toString(), state);
        // TODO store in storage
      }
    }
  }

  protected restoreState() {
    if (this.currentUri) {
      const state = this.editorState.get(this.currentUri.toString());
      if (state) {
        this.monacoEditor.restoreViewState(state);
      }
    }
  }

  async open(uri: URI, range?: IRange): Promise<void> {
    this.saveCurrentState();
    const res = await this.documentModelManager.resolveModel(uri);
    if (res) {
      this._currentDocumentModel = res;
      const model = res.toEditor();
      this.currentUri = new URI(model.uri.toString());
      this.monacoEditor.setModel(model);
      this.restoreState();
      if (range) {
        this.monacoEditor.revealRangeInCenter(range);
        this.monacoEditor.setSelection(range);
      }
      // monaco 在文件首次打开时不会触发 cursorChange
      this._onCursorPositionChanged.fire({
        position: this.monacoEditor.getPosition(),
        selectionLength: 0,
      });
    }
  }

  public async save(uri: URI): Promise<boolean> {
    return this.documentModelManager.saveModel(uri);
  }

  applyDecoration(key, options) {
    this.decorationApplier.applyDecoration(key, options);
  }

  onSelectionsChanged(listener) {
    return this.monacoEditor.onDidChangeCursorSelection((e) => {
      listener({
        selections: this.getSelections(),
        source: e.source,
      });
    });
  }

  onVisibleRangesChanged(listener) {
    const disposer = new Disposable();
    const monacoEditor = this.monacoEditor;
    disposer.addDispose(monacoEditor.onDidScrollChange((e) => {
      listener(this.monacoEditor.getVisibleRanges());
    }));
    disposer.addDispose(monacoEditor.onDidLayoutChange((e) => {
      listener(this.monacoEditor.getVisibleRanges());
    }));
    return disposer;
  }

  onConfigurationChanged(listener) {
    const monacoEditor = this.monacoEditor;
    return monacoEditor.onDidChangeConfiguration((e) => {
      listener();
    });
  }
}

export class BrowserDiffEditor implements IDiffEditor {

  @Autowired(EditorCollectionService)
  private collectionService: EditorCollectionServiceImpl;

  @Autowired(IDocumentModelManager)
  protected documentModelManager: IDocumentModelManager;

  private originalDocModel: IDocumentModel | null;

  private modifiedDocModel: IDocumentModel | null;

  public originalEditor: IMonacoImplEditor;

  public modifiedEditor: IMonacoImplEditor;

  public _disposed: boolean;

  @Autowired(INJECTOR_TOKEN)
  injector: Injector;

  constructor(private monacoDiffEditor: monaco.editor.IDiffEditor) {
    this.wrapEditors();
  }

  async compare(original: URI, modified: URI) {
    return Promise.all([this.documentModelManager.resolveModel(original), this.documentModelManager.resolveModel(modified)])
      .then(([originalDocModel, modifiedDocModel]) => {
        if (!originalDocModel) {
          throw new Error('Cannot find Original Document');
        }
        if (!modifiedDocModel) {
          throw new Error('Cannot find Modified Document');
        }
        this.originalDocModel = originalDocModel;
        this.modifiedDocModel = modifiedDocModel;
        this.monacoDiffEditor.setModel({
          original: originalDocModel.toEditor(),
          modified: modifiedDocModel.toEditor(),
        });
      });
  }

  private wrapEditors() {
    const diffEditor = this;
    const decorationApplierOriginal = this.injector.get(MonacoEditorDecorationApplier, [diffEditor.monacoDiffEditor.getOriginalEditor()]);
    this.originalEditor = {
      getId() {
        return diffEditor.monacoDiffEditor.getOriginalEditor().getId();
      },
      get currentDocumentModel() {
        return diffEditor.originalDocModel;
      },
      get currentUri() {
        return diffEditor.originalDocModel ? diffEditor.originalDocModel.uri : null;
      },
      get monacoEditor() {
        return diffEditor.monacoDiffEditor.getOriginalEditor();
      },
      getSelections() {
        return diffEditor.monacoDiffEditor.getOriginalEditor().getSelections();
      },
      insertSnippet(template: string, ranges: IRange[], opts: IUndoStopOptions ) {
        insertSnippetWithMonacoEditor(diffEditor.monacoDiffEditor.getOriginalEditor(), template, ranges, opts);
      },
      applyDecoration(key, options) {
        decorationApplierOriginal.applyDecoration(key, options);
      },
      onSelectionsChanged(listener) {
        return diffEditor.monacoDiffEditor.getOriginalEditor().onDidChangeCursorSelection((e) => {
          listener({
            selections: diffEditor.monacoDiffEditor.getOriginalEditor().getSelections() || [],
            source: e.source,
          });
        });
      },
      onVisibleRangesChanged(listener) {
        const monacoEditor = diffEditor.monacoDiffEditor.getOriginalEditor();
        const disposer = new Disposable();
        disposer.addDispose(monacoEditor.onDidScrollChange((e) => {
          listener(this.monacoEditor.getVisibleRanges());
        }));
        disposer.addDispose(monacoEditor.onDidLayoutChange((e) => {
          listener(this.monacoEditor.getVisibleRanges());
        }));
        return disposer;
      },
      onConfigurationChanged(listener) {
        const monacoEditor = diffEditor.monacoDiffEditor.getOriginalEditor();
        return monacoEditor.onDidChangeConfiguration((e) => {
          listener();
        });
      },
      setSelections(selections) {
        const monacoEditor = diffEditor.monacoDiffEditor.getOriginalEditor();
        return monacoEditor.setSelections(selections as any);
      },
      setSelection(selection) {
        const monacoEditor = diffEditor.monacoDiffEditor.getOriginalEditor();
        return monacoEditor.setSelection(selection as any);
      },
    };

    const decorationApplierModified = this.injector.get(MonacoEditorDecorationApplier, [diffEditor.monacoDiffEditor.getOriginalEditor()]);
    this.modifiedEditor = {
      getId() {
        return diffEditor.monacoDiffEditor.getModifiedEditor().getId();
      },
      get currentDocumentModel() {
        return diffEditor.modifiedDocModel;
      },
      get currentUri() {
        return diffEditor.modifiedDocModel ? diffEditor.modifiedDocModel.uri : null;
      },
      get monacoEditor() {
        return diffEditor.monacoDiffEditor.getModifiedEditor();
      },
      getSelections() {
        return diffEditor.monacoDiffEditor.getModifiedEditor().getSelections();
      },
      insertSnippet(template: string, ranges: IRange[], opts: IUndoStopOptions ) {
        insertSnippetWithMonacoEditor(diffEditor.monacoDiffEditor.getModifiedEditor(), template, ranges, opts);
      },
      applyDecoration(key: string, options: IDecorationApplyOptions[]) {
        decorationApplierModified.applyDecoration(key, options);
      },
      onSelectionsChanged(listener) {
        const monacoEditor = diffEditor.monacoDiffEditor.getModifiedEditor();
        return monacoEditor.onDidChangeCursorSelection((e) => {
          listener({
            selections: monacoEditor.getSelections() || [],
            source: e.source,
          });
        });
      },
      onVisibleRangesChanged(listener) {
        const monacoEditor = diffEditor.monacoDiffEditor.getModifiedEditor();
        const disposer = new Disposable();
        disposer.addDispose(monacoEditor.onDidScrollChange((e) => {
          listener(this.monacoEditor.getVisibleRanges());
        }));
        disposer.addDispose(monacoEditor.onDidLayoutChange((e) => {
          listener(this.monacoEditor.getVisibleRanges());
        }));
        return disposer;
      },
      onConfigurationChanged(listener) {
        const monacoEditor = diffEditor.monacoDiffEditor.getModifiedEditor();
        return monacoEditor.onDidChangeConfiguration((e) => {
          listener();
        });
      },
      setSelections(selections) {
        const monacoEditor = diffEditor.monacoDiffEditor.getModifiedEditor();
        return monacoEditor.setSelections(selections as any);
      },
      setSelection(selection) {
        const monacoEditor = diffEditor.monacoDiffEditor.getModifiedEditor();
        return monacoEditor.setSelection(selection as any);
      },

    };
    this.collectionService.addEditors([this.originalEditor, this.modifiedEditor]);
  }

  layout(): void {
    return this.monacoDiffEditor.layout();
  }

  focus(): void {
    this.monacoDiffEditor.focus();
  }

  dispose(): void {
    this.collectionService.removeEditors([this.originalEditor, this.modifiedEditor]);
    this.monacoDiffEditor.dispose();
    this._disposed = true;
  }

}

// utils

function bindPreventNavigation(div: HTMLElement) {
  div.addEventListener('mousewheel', preventNavigation as any);
}

function preventNavigation(this: HTMLDivElement, e: WheelEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (this.offsetWidth + this.scrollLeft + e.deltaX > this.scrollWidth) {
    e.preventDefault();
    e.stopPropagation();
  } else if (this.scrollLeft + e.deltaX < 0) {
    e.preventDefault();
    e.stopPropagation();
  }
}
