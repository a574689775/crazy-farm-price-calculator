import type { WeatherMutation } from '@/types'
import { crops } from '@/data/crops'

/**
 * 所有突变的固定顺序（用于位图编码）
 * 顺序：品质(5) + 异形(8) + 常见(10) + 月球(4) + 罕见(4) + 往期(3) + 中间(5) = 39个
 */
const ALL_MUTATIONS_ORDER: WeatherMutation[] = [
  // 品质突变 (5个)
  '银', '金', '水晶', '星空', '流光',
  // 异形突变 (8个)
  '薯片', '方形', '糖葫芦', '连体', '黄瓜蛇', '万圣夜', '香蕉猴', '笑日葵',
  // 常见突变 (10个，品质顺序：紫→绿→灰)
  '瓷化', '亮晶晶', '星环', '落雷', '冰冻', '颤栗', '覆雪', '潮湿', '迷雾', '生机',
  // 月球突变 (4个，太阳耀斑在中间状态)
  '流火', '日蚀', '暗雾', '陨石',
  // 罕见突变 (4个)
  '血月', '彩虹', '荧光', '霓虹',
  // 往期突变 (3个)
  '幽魂', '极光', '惊魂夜',
  // 中间状态突变 (5个，含太阳耀斑)
  '太阳耀斑', '沙尘', '灼热', '结霜', '陶化',
]

/**
 * 创建突变索引映射
 */
const MUTATION_INDEX_MAP = new Map<WeatherMutation, number>()
ALL_MUTATIONS_ORDER.forEach((mutation, index) => {
  MUTATION_INDEX_MAP.set(mutation, index)
})

/**
 * 分享数据接口
 */
export interface ShareData {
  cropIndex: number
  weight: number
  percentage: number
  mutations: WeatherMutation[]
}

/**
 * 将突变数组编码为位图
 * @param mutations 选中的突变数组
 * @returns 位图数组（每个字节8位）
 */
function encodeMutations(mutations: WeatherMutation[]): Uint8Array {
  const bits = new Array(ALL_MUTATIONS_ORDER.length).fill(0)
  
  mutations.forEach(mutation => {
    const index = MUTATION_INDEX_MAP.get(mutation)
    if (index !== undefined) {
      bits[index] = 1
    }
  })
  
  // 将位数组转换为字节数组
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      if (bits[i + j]) {
        byte |= (1 << (7 - j))
      }
    }
    bytes.push(byte)
  }
  
  return new Uint8Array(bytes)
}

/**
 * 将位图解码为突变数组
 * @param bytes 位图字节数组
 * @returns 选中的突变数组
 */
function decodeMutations(bytes: Uint8Array): WeatherMutation[] {
  const mutations: WeatherMutation[] = []
  const bits: number[] = []
  
  // 将字节数组转换为位数组
  bytes.forEach(byte => {
    for (let i = 0; i < 8; i++) {
      bits.push((byte >> (7 - i)) & 1)
    }
  })
  
  // 根据位数组恢复突变
  bits.slice(0, ALL_MUTATIONS_ORDER.length).forEach((bit, index) => {
    if (bit === 1) {
      mutations.push(ALL_MUTATIONS_ORDER[index])
    }
  })
  
  return mutations
}

/**
 * Base64URL编码（URL安全，不需要转义）
 */
function base64UrlEncode(bytes: Uint8Array): string {
  // 转换为Base64
  let base64 = btoa(String.fromCharCode(...bytes))
  // 替换为URL安全字符
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Base64URL解码
 */
function base64UrlDecode(str: string): Uint8Array {
  // 恢复Base64字符
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // 补全padding
  while (base64.length % 4) {
    base64 += '='
  }
  // 解码
  const binary = atob(base64)
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)))
}

/**
 * 编码分享数据为短链接
 * 格式：作物索引(1字节) + 重量*100(2字节) + 百分比(1字节) + 突变位图(5字节) = 9字节
 * Base64编码后约12个字符
 */
export function encodeShareData(data: ShareData): string {
  const { cropIndex, weight, percentage, mutations } = data
  
  // 验证数据
  if (cropIndex < 0 || cropIndex >= crops.length) {
    throw new Error('Invalid crop index')
  }
  if (weight < 0 || weight > 1000) {
    throw new Error('Invalid weight')
  }
  if (percentage < 1 || percentage > 100) {
    throw new Error('Invalid percentage')
  }
  
  // 打包数据
  const bytes = new Uint8Array(9)
  
  // 作物索引 (1字节，0-255)
  bytes[0] = cropIndex
  
  // 重量 * 100，保留2位小数 (2字节，0-65535，支持0-655.35kg)
  const weightInt = Math.round(weight * 100)
  bytes[1] = (weightInt >> 8) & 0xFF
  bytes[2] = weightInt & 0xFF
  
  // 百分比 (1字节，1-100)
  bytes[3] = percentage
  
  // 突变位图 (5字节，40位，足够34个突变)
  const mutationBytes = encodeMutations(mutations)
  for (let i = 0; i < 5 && i < mutationBytes.length; i++) {
    bytes[4 + i] = mutationBytes[i]
  }
  
  // Base64URL编码
  return base64UrlEncode(bytes)
}

/**
 * 解码分享数据
 */
export function decodeShareData(encoded: string): ShareData | null {
  try {
    const bytes = base64UrlDecode(encoded)
    
    if (bytes.length !== 9) {
      return null
    }
    
    // 解析数据
    const cropIndex = bytes[0]
    const weightInt = (bytes[1] << 8) | bytes[2]
    const weight = weightInt / 100
    const percentage = bytes[3]
    const mutationBytes = bytes.slice(4, 9)
    const mutations = decodeMutations(mutationBytes)
    
    // 验证数据
    if (cropIndex >= crops.length) {
      return null
    }
    if (weight < 0 || weight > 1000) {
      return null
    }
    if (percentage < 1 || percentage > 100) {
      return null
    }
    
    return {
      cropIndex,
      weight,
      percentage,
      mutations,
    }
  } catch (error) {
    return null
  }
}

/**
 * 生成分享URL
 */
export function generateShareUrl(data: ShareData, baseUrl?: string): string {
  const encoded = encodeShareData(data)
  const url = baseUrl || window.location.origin + window.location.pathname
  return `${url}?s=${encoded}`
}

/**
 * 从URL参数解析分享数据
 */
export function parseShareUrl(): ShareData | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('s')
  
  if (!encoded) {
    return null
  }
  
  return decodeShareData(encoded)
}

