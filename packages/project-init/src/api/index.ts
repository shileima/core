import axios from 'axios';

import { IFormDatas } from '../common';
import { API_HOST } from '../config/host';

const host = process.env.NODE_ENV === 'development' ? API_HOST.TEST_OPEN : API_HOST.TEST;

// 获取有权限的工程按照归属团队树状信息 (打开工程弹框)
export async function getBelongProjectTree(params) {
  try {
    const res = await axios({
      method: 'get',
      url: `${host}/v1/workbench/getBelongProjectTree`,
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

// 获取最近一次操作的工程树（最新操作工程A对应的树状结构）
export async function getLastedOperateProject(params) {
  try {
    const res = await axios({
      method: 'get',
      url: `${host}/v1/workbench/getLastedOperateProject`,
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

// 模糊搜索人员列表
export async function getMiscListByName(params: { name: string; allUser: boolean }) {
  try {
    const res = await axios({
      method: 'get',
      url: 'https://eci.sankuai.com/api/qa/v1/common/getMiscList',
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

// 新建工程
export const postCreateProjectSave = async (params: IFormDatas) => {
  try {
    const res = await axios({
      method: 'post',
      url: `${host}/v1/workbench/addProject`,
      data: params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
};

// 查询组织部门树（支持虚拟组织）
export async function getOrgTreeByOrgId(params: { orgId: string }) {
  try {
    const res = await axios({
      method: 'get',
      url: `${host}/v1/workbench/getOrgTree`,
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

// 获取mis的组织架构信息
export async function getUserInfoBatch(params: { mis: string }) {
  try {
    const res = await axios({
      method: 'get',
      url: `${host}/v1/workbench/getUserInfoBatch`,
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR: ', error);
  }
}
