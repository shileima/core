import { PlusSquareOutlined, FolderOpenOutlined, DownOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useDebounce } from 'ahooks';
import { Space, Tooltip, Button, Input, Dropdown, ConfigProvider, Tabs, Tree, Avatar, Divider } from 'antd';
import type { TabsProps } from 'antd';
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';

import { useInjectable } from '@opensumi/ide-core-browser';
import { IMainLayoutService } from '@opensumi/ide-main-layout';
import { ProjectService } from '@opensumi/ide-project-init/lib/browser/project.service';
import { IProjectInitProps, ProjectNode } from '@opensumi/ide-project-init/lib/common';
import { DAOJIA_DEV_ORG_ID, QUALITY_PERFORMAnce_ORG_ID } from '@opensumi/ide-project-init/src/config';

import { getProjectDataByDimension } from '../api';
import { projectSwitchTabs } from '../common';
import { getCookieValue } from '../utils';

import * as styles from './components.module.less';


const { DirectoryTree } = Tree;

export const HeaderTop = () => {
  const layoutService = useInjectable<IMainLayoutService>(IMainLayoutService);
  const bottomTabbarService = layoutService.getTabbarService('bottom');

  const projectService = useInjectable<IProjectInitProps>(ProjectService);

  const [buttonHighlight, setButtonState] = useState<Record<'editor' | 'bottom' | 'right', boolean>>({
    editor: true,
    bottom: false,
    right: true,
  });
  const [selectedProject, setSelectedProject] = useState<ProjectNode>({
    key: '',
    title: '',
  });

  const defaultTreeMapData = Object.keys(projectSwitchTabs).reduce((acc, cur) => {
    acc[cur] = [];
    return acc;
  }, {} as any);

  const [treeDataMap, setTreeDataMap] = useState<any>(defaultTreeMapData);
  const [projectSearchParams, setProjectSearchParams] = useState<any>({
    dimension: '1',
    projectId: '',
    projectName: '',
    operator: getCookieValue('user_name'),
  });
  const [activeTabKey, setActiveTabKey] = useState<string>('1');

  // 选择工程
  const handleProjectSelect = (selectedKeys, node) => {
    const { key, title } = node.node;
    setSelectedProject({
      key,
      title,
    });
  };

  const itemChildrenRender: React.ReactNode = ({ key }) => <div>{key}</div>;

  const items: TabsProps['items'] = Object.entries(projectSwitchTabs).map(([key, label]) => {
    const children =
      treeDataMap[key].length > 0 ? (
        <DirectoryTree
          showIcon
          treeData={treeDataMap[key]}
          defaultExpandedKeys={[QUALITY_PERFORMAnce_ORG_ID]}
          onSelect={handleProjectSelect}
        />
      ) : (
        <div>暂无数据</div>
      );

    return { key, label, children };
  });

  const handleTabSwitch = async (dimension: string, projectName = '') => {
    setActiveTabKey(dimension);
    const searchParams = {
      ...projectSearchParams,
      dimension: projectName ? undefined : dimension,
      projectName,
    };
    const res = await getProjectDataByDimension(searchParams);
    const { code, data } = res;
    if (code === 0) {
      setTreeDataMap({
        ...treeDataMap,
        [dimension]: data,
      });
    } else {
      console.error('获取数据失败');
    }
  };

  useEffect(() => {
    bottomTabbarService.currentContainerId === '';
    const disposable1 = bottomTabbarService.onCurrentChange(() => {
      setButtonState({
        ...buttonHighlight,
        bottom: !!bottomTabbarService.currentContainerId,
      });
    });

    handleTabSwitch('1', '');

    return () => {
      disposable1.dispose();
    };
  }, []);

  const handleCreateProject = () => projectService.createProject();
  const handleOpenPriject = () => projectService.openProject();

  const ref = useRef<any>(null);

  const debouncedSelectedProjectValue = useDebounce(projectSearchParams.projectName, { wait: 500 });

  const handleProjectInput = (value: string) => {
    setActiveTabKey('1');
    setProjectSearchParams({
      ...projectSearchParams,
      projectName: value,
    });
  };

  // 项目搜索框变更查询
  useEffect(() => {
    handleTabSwitch('1', debouncedSelectedProjectValue);
  }, [debouncedSelectedProjectValue, projectSearchParams.projectName]);

  return (
    <div style={{ width: '100%', padding: '0 5px' }} ref={ref}>
      {/* remove prefixCls='sumi_antd' */}
      <ConfigProvider getPopupContainer={() => ref.current} prefixCls='xbot_theme'>
        <div className={styles.top_container}>
          <div className={styles.top_left}>
            <div className={styles.main_site_title}>Xbot</div>
            <div className={styles.project_dropdown_swith}>
              <Dropdown
                dropdownRender={(menu) => (
                  <div
                    style={{
                      width: '300px',
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,.2)',
                      padding: '10px',
                    }}
                  >
                    <Input
                      className={styles.project_input}
                      value={projectSearchParams.projectName}
                      placeholder='全局搜索工程'
                      size='small'
                      bordered={true}
                      type='line'
                      suffix={<DownOutlined style={{ color: '#999' }} />}
                      onChange={(e) => handleProjectInput(e.target.value)}
                    />
                    <Tabs
                      defaultActiveKey='1'
                      activeKey={activeTabKey}
                      items={items}
                      size='small'
                      onChange={handleTabSwitch}
                    />
                  </div>
                )}
                overlayStyle={{}}
              >
                <a onClick={(e) => e.preventDefault()} style={{ color: 'gray', display: 'flex' }}>
                  <Space>
                    <i
                      className='xboticon xboticon-global-o-color'
                      style={{ margin: '0 5px 0 10px', color: '#8AB7FB' }}
                    ></i>
                  </Space>
                  <Space>
                    {selectedProject.title || '请选择工程'}
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
            </div>
            <div className={styles.project_btn_box}>
              <Tooltip title='创建工程'>
                <Button onClick={handleCreateProject} shape='default' type='text' icon={<PlusSquareOutlined />} />
              </Tooltip>
              <Tooltip title='打开工程'>
                <Button onClick={handleOpenPriject} shape='default' type='text' icon={<FolderOpenOutlined />} />
              </Tooltip>
            </div>
          </div>
          <div className={styles.top_center}>
            <Button type='text' className={styles.flex_box} style={{ padding: '0 5px' }}>
              <i className='xboticon xboticon-arrow-go-back-fill' />
            </Button>
            <Button type='text' className={styles.flex_box} style={{ padding: '0 5px' }}>
              <i className='xboticon xboticon-arrow-go-forward-fill' />
            </Button>
            <Divider type='vertical' style={{ height: '20px' }} />
            <Button type='text' className={styles.flex_box}>
              <i className={'xboticon xboticon-save-line ' + styles.icon} />
              <span>保存</span>
            </Button>
            <Button type='text' className={styles.flex_box}>
              <i className={'xboticon xboticon-play-circle-line ' + styles.icon} style={{ color: '#00A85A' }} />
              <span>运行</span>
            </Button>
            <Button type='text' className={styles.flex_box}>
              <i className={'xboticon xboticon-send-plane-line ' + styles.icon} />
              <span>发布</span>
            </Button>
          </div>

          <div className={styles.top_right}>
            <Input placeholder='搜索' prefix={<SearchOutlined className='site-form-item-icon' />} />
            <Avatar
              src={`https://serverless.sankuai.com/dx-avatar/?type=img&mis=${getCookieValue('user_name')}`}
              style={{ height: '30px', width: '36px', margin: '0 5px' }}
              icon={<UserOutlined />}
            />
          </div>
        </div>
      </ConfigProvider>
    </div>
  );
};
