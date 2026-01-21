import { useState } from 'react'
import { Modal } from '../Modal'
import { changelog } from '@/data/changelog'
import './Footer.css'

export const Footer = () => {
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showDonateModal, setShowDonateModal] = useState(false)
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)

  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-link" onClick={() => setShowChangelogModal(true)}>
            {changelog[0].version}
          </div>
          <div className="footer-actions">
            <div className="footer-link" onClick={() => setShowGroupModal(true)}>
              用户群
            </div>
            <div className="footer-link" onClick={() => setShowDonateModal(true)}>
              支持作者
            </div>
            <div className="footer-link" onClick={() => setShowDisclaimerModal(true)}>
              免责声明
            </div>
          </div>
        </div>
      </footer>

      {/* 更新日志模态框 */}
      <Modal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
        title="更新日志"
      >
        <div className="changelog">
          {changelog.map((item) => (
            <div key={item.version} className="changelog-item">
              <h4 className="changelog-version">
                {item.version} <span className="changelog-date">({item.date})</span>
              </h4>
              <ul className="changelog-list">
                {item.items.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      {/* 用户群二维码模态框 */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="加入用户群"
      >
        <img
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/用户群1.21.jpg"
          alt="用户群二维码"
          className="modal-qrcode"
        />
        <p className="modal-hint">扫码加入用户群，一起交流讨论</p>
      </Modal>

      {/* 捐赠二维码模态框 */}
      <Modal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        title="支持作者"
      >
        <div className="modal-text">
          <p>本工具完全免费，但维持运行需要成本。</p>
          <p>如果你觉得它帮到了你，欢迎扫码支持，</p>
          <p>帮助它活下去、变得更好。</p>
          <p>感谢每一位支持的小伙伴，你们让更新更有意义✨</p>
        </div>
        <img
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/收款码1.15.png"
          alt="捐赠二维码"
          className="modal-qrcode"
        />
        <p className="modal-hint">无论是否支持，都感谢你的使用 ❤️</p>
      </Modal>

      {/* 免责声明模态框 */}
      <Modal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        title="免责声明"
      >
       <div className="modal-text disclaimer-text">
        <p><strong>1. 版权与素材声明（重要）</strong></p>
        <p>本工具为个人开发、非营利的第三方项目。页面中使用的部分图片素材源自网易游戏《蛋仔派对》，其所有权及相关知识产权均归网易公司所有。</p>
        <p>我们尊重版权，此使用行为旨在为游戏爱好者提供免费的计算辅助，无任何商业目的。我们在此明确不主张对上述素材的任何权利，并对网易游戏创造的内容表示赞赏与尊重。</p>
        <p>若您是该等素材的版权方（或授权代表），认为我们的使用构成侵权，请通过以下方式联系我们，我们将在收到有效通知后第一时间下架或替换相关素材： 574689775@qq.com。</p>
        
        <p><strong>2. 非官方与独立性声明</strong></p>
        <p>本工具为爱好者独立开发，与网易游戏《蛋仔派对》官方无任何关联、赞助或授权关系。非官方产品。</p>
        
        <p><strong>3. 数据免责与风险自担</strong></p>
        <p>本工具所有计算功能、数据及结果均基于对公开游戏机制的分析，仅供参考，不保证100%准确性，不作为游戏内交易的官方依据。实际游戏内数值请以官方发布为准。</p>
        <p>用户因使用、依赖本工具信息所产生的任何直接或间接风险、损失，需自行承担全部责任。</p>
        
        <p><strong>4. 开发者责任限制</strong></p>
        <p>开发者在本工具可用的技术上尽力保证其稳定，但对于服务的连续性、准确性、安全性不作担保。对于因使用本工具而产生的任何问题，开发者的责任在法律允许的最大范围内予以免除。</p>
        
        <p><strong>5. 服务变更与终止</strong></p>
        <p>开发者保留随时修改、暂停或终止本工具服务的权利，无需事先通知。</p>
        
        <p><strong>6. 用户同意</strong></p>
        <p>继续使用本工具，即表示您已阅读、理解并完全同意本声明的全部条款。</p>
      </div>
      </Modal>
    </>
  )
}

