import { Modal } from '@/components/Modal'
import type { CropConfig, WeatherMutation } from '@/types'
import { getSelectedQuality, getSelectedSpecial, shareTemplatesWithSpecial, shareTemplatesWithoutSpecial } from './utils'
import './PriceCalculator.css'

interface ShareModalProps {
  isOpen: boolean
  shareUrl: string
  crop: CropConfig
  selectedMutations: WeatherMutation[]
  onClose: () => void
  onCopy: (text: string) => void
}

/**
 * 分享弹窗组件
 */
export const ShareModal = ({
  isOpen,
  shareUrl,
  crop,
  selectedMutations,
  onClose,
  onCopy,
}: ShareModalProps) => {
  const handleCopy = () => {
    // 获取当前品质、异形突变和作物名
    const quality = getSelectedQuality(selectedMutations)
    const special = getSelectedSpecial(selectedMutations)
    const cropName = crop.name
    
    // 根据是否有异形突变选择不同的文案模版
    let shareText: string
    if (special) {
      // 有异形突变：只显示品质+异形突变
      const randomTemplate = shareTemplatesWithSpecial[Math.floor(Math.random() * shareTemplatesWithSpecial.length)]
      shareText = randomTemplate(quality, special)
    } else {
      // 无异形突变：品质+作物名
      const randomTemplate = shareTemplatesWithoutSpecial[Math.floor(Math.random() * shareTemplatesWithoutSpecial.length)]
      shareText = randomTemplate(quality, cropName)
    }
    
    const textToCopy = `${shareText} ${shareUrl}`
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      onClose()
      onCopy('已复制到剪贴板')
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="分享计算结果"
    >
      <div className="share-url-container">
        <input
          type="text"
          className="share-url-input"
          value={shareUrl}
          readOnly
          onClick={(e) => e.currentTarget.select()}
        />
        <div
          className="share-copy-button"
          onClick={handleCopy}
        >
          点此复制链接
        </div>
      </div>
      <div className="share-info">
        <p>复制链接发送给好友</p>
      </div>
    </Modal>
  )
}
