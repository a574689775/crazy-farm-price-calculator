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
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/用户群1.15.png"
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
          <p><strong>1. 非官方工具</strong></p>
          <p>本工具为第三方独立开发，与网易游戏《蛋仔派对》官方无任何关联，非官方授权产品。</p>
          
          <p><strong>2. 数据仅供参考</strong></p>
          <p>本工具提供的价格计算结果基于公开的游戏机制和数据，仅供参考，不保证准确性。实际游戏内价格以官方为准。</p>
          
          <p><strong>3. 使用风险</strong></p>
          <p>用户使用本工具所产生的任何后果，包括但不限于数据错误、经济损失等，均由用户自行承担。</p>
          
          <p><strong>4. 免责条款</strong></p>
          <p>开发者不对本工具的使用结果承担任何责任，包括但不限于直接、间接、偶然、特殊或后果性损失。</p>
          
          <p><strong>5. 知识产权</strong></p>
          <p>《蛋仔派对》为网易游戏所有，本工具仅用于学习和交流目的，不涉及任何商业用途。</p>
          
          <p><strong>6. 服务变更</strong></p>
          <p>开发者保留随时修改、暂停或终止本工具服务的权利，无需提前通知。</p>
          
          <p><strong>7. 用户责任</strong></p>
          <p>用户使用本工具即表示已阅读、理解并同意本免责声明的所有条款。</p>
        </div>
      </Modal>
    </>
  )
}

