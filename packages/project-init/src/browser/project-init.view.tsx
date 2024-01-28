

import { Button, Modal as AntdModal, ConfigProvider } from 'antd';
import { useState, useRef, useEffect } from 'react';
import * as React from 'react';

import { MessageType, ProgressLocation, or, useInjectable } from '@opensumi/ide-core-browser';
import { IProgressService } from '@opensumi/ide-core-browser/lib/progress';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
// import { IHeaderTopService } from '../../header-top/common';
// import { HeaderTopService } from '../../header-top/browser/project.service';

import { getBelongProjectTree, getUserInfoBatch, postCreateProjectSave } from '../api';
import { ProjectService } from '../browser/project.service';
import { IFormDatas, IProjectInitProps, ProjectNode } from '../common';
import { defaultFormDatas } from '../config';
import { getCookieValue } from '../utils';

import CreateProject from './component/createProject';
import OpenProject from './component/openProject';
import * as styles from './project-init.module.less';

export const ProjectInitServicesView = React.memo(() => {
  const messageService = useInjectable<IMessageService>(IMessageService);
  const progressService = useInjectable<IProgressService>(IProgressService);
  const dialogService = useInjectable<IDialogService>(IDialogService);

  const createProjectRef = useRef<any>(null);
  const openProjectRef = useRef<any>(null);

  const projectService = useInjectable<IProjectInitProps>(ProjectService);

  const [isCreateProjecModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isOpenProjectModalOpen, setIsOpenProjectModalOpen] = useState(false);
  const [projectTreeData, setProjectTreeData] = useState<ProjectNode[]>([]);
  const [formDatas, setFormDatas] = useState<IFormDatas>({
    ...defaultFormDatas,
  }); // 表单数据
  const [selectedProject, setSelectedProject] = useState<any>({}); // 选中打开的工程

  // 用户数据，后续需要将状态管理抽离成状态管理模块，供全局通信调用
  const [userInfo, setUserInfo] = useState<any>({}); // 登录人信息

  // 新建工程
  const createProject = React.useCallback(async () => {
    setIsCreateProjectModalOpen(true);
    if (createProjectRef.current) {
      fetchUserInfo();
    }
  }, [createProjectRef.current]);

  // 打开工程
  const openProject = React.useCallback(async () => {
    const submiteRes = await getBelongProjectTree({
      operator: getCookieValue('user_name'),
    });
    const { code, data } = submiteRes;
    if (code !== 0) {
      messageService.warning('获取最近操作工程失败');
    } else {
      setProjectTreeData(data);
    }
    setIsOpenProjectModalOpen(true);
  }, []);

  // 更新表单数据
  const updateFormDatas = (data: any) => {
    setFormDatas({
      ...formDatas,
      ...data,
    });
  };

  // 确认新建工程
  const handleCreateProjectSubmite = async () => {
    if (!createProjectRef.current) {return;}
    const checkRes = await createProjectRef.current.checkform();
    if (!checkRes) {return messageService.warning('请检查表单');}
    const { belongType, ...others } = formDatas;
    const handledFormDatas = {
      ...others,
      operator: getCookieValue('user_name'),
    };
    belongType === 'org' ? delete handledFormDatas.belongMis : delete handledFormDatas.belongOrg;
    const projectSaveRes = await postCreateProjectSave(handledFormDatas);
    const { code, msg } = projectSaveRes;
    if (code !== 0) {
      messageService.warning(msg || '新建工程失败');
      createProjectRef.current.resetFormDatas();
    } else {
      messageService.info(msg || '新建工程成功');
      createProjectRef.current.resetFormDatas();
      setIsCreateProjectModalOpen(false);
    }
  };

  // 取消新建工程
  const handleCancel = () => {
    setIsCreateProjectModalOpen(false);
  };

  // 打开工程节点单击事件
  const handleProjectNodeClick = (node: ProjectNode) => {
    setSelectedProject(node);
  };

  // 确认打开工程
  const handleOpenProjectOk = () => {
    setIsOpenProjectModalOpen(false);
  };

  // 取消打开工程
  const handleOpenProjectCancel = () => {
    setIsOpenProjectModalOpen(false);
  };

  // 获取用户信息
  const fetchUserInfo = async () => {
    const mis = getCookieValue('user_name');
    const infoRes = await getUserInfoBatch({
      mis,
    });
    const { code, data } = infoRes;
    if (code !== 0) {
      messageService.warning('获取用户信息失败');
    } else {
      setUserInfo(data);
      const { orgId } = data[mis];
      const newFormDatas = {
        ...formDatas,
        belongOrg: orgId,
        belongMis: mis,
        managerOrg: [orgId],
      };
      setFormDatas(newFormDatas);

      // 给表单赋值
      if (createProjectRef.current) {
        createProjectRef.current.setFormDatas(newFormDatas);
      }
    }
  };

  const handleCreateProject = () => projectService.createProject();
  const handleOpenPriject = () => projectService.openProject();

  useEffect(() => {
    const disposableCreateProject = projectService.onDidProjectEvent((type: string) => {
      if (type === 'create') {return createProject();}
      if (type === 'open') {return openProject();}
    });

    return () => {
      disposableCreateProject.dispose();
    };
  }, []);

  const ref = useRef<any>(null);
  return (
    <div className={styles.components_wrap} ref={ref}>
      {/* 引用了antd, 与自带主题有冲突, 去掉主题 prefixCls='sumi_antd' */}
      <ConfigProvider getPopupContainer={() => ref.current} prefixCls='xbot_theme'>
        <div className={styles.header_text}>
          <h1 style={{ paddingRight: '10px', color: '#666' }}>欢迎使用Xbot!</h1>
          <a href='http://km.sankuai.com' target='_blank'>
            使用说明
          </a>
        </div>
        <div className={styles.body_opts}>
          <div className={styles.opt_item} onClick={handleCreateProject}>
            <i className={'xboticon xboticon-folder-add-fill ' + styles.icon_add_folder_add_fill}></i>
            <span className={styles.text}>新建工程</span>
          </div>
          <div className={styles.opt_item} onClick={handleOpenPriject}>
            <i className={'xboticon xboticon-folder-open-fill ' + styles.icon_add_folder_add_fill}></i>
            <span className={styles.text}>打开工程</span>
          </div>
          <AntdModal
            title='新建工程'
            open={isCreateProjecModalOpen}
            okText='确定'
            cancelText='取消'
            onOk={handleCreateProjectSubmite}
            onCancel={handleCancel}
            width={620}
          >
            <CreateProject
              ref={createProjectRef}
              formDatas={formDatas}
              updateFormDatas={updateFormDatas}
            ></CreateProject>
          </AntdModal>
          <AntdModal
            title='打开工程'
            open={isOpenProjectModalOpen}
            okText='确定'
            cancelText='取消'
            onOk={handleOpenProjectOk}
            onCancel={handleOpenProjectCancel}
          >
            <OpenProject
              ref={openProjectRef}
              projectTreeData={projectTreeData}
              handleProjectNodeClick={handleProjectNodeClick}
            ></OpenProject>
          </AntdModal>
        </div>
      </ConfigProvider>
    </div>
  );
});
