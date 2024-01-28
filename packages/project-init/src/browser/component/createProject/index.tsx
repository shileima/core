import { Space, Form, Radio, Select, Input } from 'antd';
import * as React from 'react';
import { ReactNode } from 'react';
import { useImperativeHandle, forwardRef } from 'react';
import { runes } from 'runes2';

import { getMiscListByName } from '../../../api';
import { IProjectCreateProps } from '../../../common';
import { defaultFormDatas } from '../../../config';
import OrgSelect from '../orgSelect';

import * as styles from './style.module.less';
import UserSelect, { UserValue } from './UserSelect';


const { TextArea } = Input;

const basicRules = [{ required: true, message: '不能为空' }];
const layout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 },
};

const CreateProject: React.FC<IProjectCreateProps> = forwardRef((props, ref) => {
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    // 校验表单
    checkform: () => form
        .validateFields()
        .then((values) => true)
        .catch((errorInfo) => {
          console.error(errorInfo);
          return false;
        }),
    // 重置表单
    resetFormDatas: () => {
      props.updateFormDatas({
        ...defaultFormDatas,
      });
      form.resetFields();
    },
    // 给表单赋值
    setFormDatas: (data: any) => {
      // 给belongOrg赋值
      if (data.belongOrg) {
        form.setFieldsValue({ belongOrg: data.belongOrg });
        form.validateFields(['belongOrg']);
      }
    },
  }));

  // 选择归属团队回调
  const handleBelongTypeChange = (value: string) => {
    props.updateFormDatas({ belongType: value });
    form.setFieldsValue({ belongType: value });
    form.validateFields(['belongOrg']);
  };

  // 选择组织
  const handleOrgOnChange = (value: string[], label: ReactNode[], type: string) => {
    props.updateFormDatas({ [type]: value });
    form.setFieldsValue({ [type]: value });
    form.validateFields([type]);
  };

  // 选择人员
  const handleMisOnchange = (users: UserValue[], type: string) => {
    const userMisList = users.map((item: UserValue) => item.value);
    props.updateFormDatas({ [type]: userMisList });
    form.setFieldsValue({ [type]: userMisList });
    form.validateFields([type]);
  };

  return (
    <Form
      {...layout}
      form={form}
      name='control-hooks'
      style={{ maxWidth: 600 }}
      initialValues={{
        ...defaultFormDatas,
      }}
    >
      <Form.Item name='projectName' label='工程名称' rules={[...basicRules]}>
        <Input
          placeholder='请输入工程名称'
          count={{
            show: true,
            max: 30,
            strategy: (txt) => runes(txt).length,
            exceedFormatter: (txt, { max }) => runes(txt).slice(0, max).join(''),
          }}
          onChange={(event) => props.updateFormDatas({ projectName: event.target.value })}
        />
      </Form.Item>
      <Form.Item name='type' label='工程类型' rules={[{ required: true }]}>
        <Radio.Group
          value={props.formDatas.type}
          onChange={(event) => props.updateFormDatas({ type: event.target.value })}
        >
          <Radio value={1}>移动端</Radio>
          <Radio value={2}>网页端</Radio>
          <Radio value={3}>桌面端</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name='projectDesc' label='工程描述'>
        <TextArea
          rows={4}
          placeholder='请输入工程描述, 100字以内'
          maxLength={100}
          onChange={(event) => props.updateFormDatas({ projectDesc: event.target.value })}
        />
      </Form.Item>

      <Form.Item name='belongType' label='归属团队' className={styles.form_item_box}>
        <Radio.Group onChange={(event) => handleBelongTypeChange(event.target.value)} style={{ display: 'flex' }}>
          <Form.Item>
            <Radio value={'org'}>团队</Radio>
            <Space.Compact style={{ marginRight: '10px' }}>
              <Form.Item name='belongOrg' rules={props.formDatas.belongType === 'org' ? [...basicRules] : []}>
                <OrgSelect
                  defaultValue={[props.formDatas.belongOrg as string]}
                  handleOnChange={(value: string[], label: ReactNode[]) => handleOrgOnChange(value, label, 'belongOrg')}
                  name='belongOrg'
                  multiple={false}
                  allowClear={false}
                  disabled={props.formDatas.belongType !== 'org'}
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item>
            <Radio value={'mis'}>个人</Radio>
          </Form.Item>
        </Radio.Group>
      </Form.Item>
      <Form.Item name='managerOrg' label='管理权限'>
        <Space.Compact className={styles.form_item_box}>
          <Form.Item name='belongOrg'>
            <OrgSelect
              defaultValue={props.formDatas.managerOrg}
              handleOnChange={(value: string[], label: ReactNode[]) => handleOrgOnChange(value, label, 'managerOrg')}
              multiple={true}
              treeCheckable={true}
              disabledOrgIds={props.formDatas.managerOrg?.slice(0, 1)}
              name='managerOrg'
            />
          </Form.Item>
          <Form.Item name='managerMis' style={{ width: '160px', paddingLeft: '5px' }}>
            <UserSelect onChange={(value: UserValue[]) => handleMisOnchange(value, 'managerMis')} />
          </Form.Item>
        </Space.Compact>
      </Form.Item>
      <Form.Item name='editOrg' label='编辑权限'>
        <Space.Compact className={styles.form_item_box}>
          <Form.Item name='belongOrg'>
            <OrgSelect
              handleOnChange={(value: string[], label: ReactNode[]) => handleOrgOnChange(value, label, 'editOrg')}
              multiple={true}
              treeCheckable={true}
              name='editOrg'
            />
          </Form.Item>
          <Form.Item name='editMis' style={{ width: '160px', paddingLeft: '5px' }}>
            <UserSelect onChange={(value: UserValue[]) => handleMisOnchange(value, 'editMis')} />
          </Form.Item>
        </Space.Compact>
      </Form.Item>
      <Form.Item name='readOrg' label='只读权限'>
        <Space.Compact className={styles.form_item_box}>
          <Form.Item name='readOrg'>
            <OrgSelect
              handleOnChange={(value: string[], label: ReactNode[]) => handleOrgOnChange(value, label, 'readOrg')}
              multiple={true}
              treeCheckable={true}
              name='readOrg'
            />
          </Form.Item>
          <Form.Item name='readMis' style={{ width: '160px', paddingLeft: '5px' }}>
            <UserSelect onChange={(value: UserValue[]) => handleMisOnchange(value, 'readMis')} />
          </Form.Item>
        </Space.Compact>
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.gender !== currentValues.gender}>
        {({ getFieldValue }) =>
          getFieldValue('gender') === 'other' ? (
            <Form.Item name='customizeGender' label='Customize Gender' rules={[...basicRules]}>
              <Input />
            </Form.Item>
          ) : null
        }
      </Form.Item>
    </Form>
  );
});

export default CreateProject;
