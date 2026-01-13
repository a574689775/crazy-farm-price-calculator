import { useState } from 'react'
import { Modal } from '../Modal'
import { changelog } from '@/data/changelog'
import './Footer.css'

export const Footer = () => {
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showDonateModal, setShowDonateModal] = useState(false)
  const [showChangelogModal, setShowChangelogModal] = useState(false)

  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <button className="footer-link" onClick={() => setShowChangelogModal(true)}>
            {changelog[0].version}
          </button>
          <div className="footer-actions">
            <button className="footer-link" onClick={() => setShowGroupModal(true)}>
              加入用户群
            </button>
            <button className="footer-link" onClick={() => setShowDonateModal(true)}>
              捐赠作者
            </button>
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
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/用户群1.12.png"
          alt="用户群二维码"
          className="modal-qrcode"
        />
        <p className="modal-hint">扫码加入用户群，一起交流讨论</p>
      </Modal>

      {/* 捐赠二维码模态框 */}
      <Modal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        title="请开发者喝杯咖啡☕"
      >
        <div className="modal-text">
          <p>独立开发不易，服务器和域名都需要成本 💰</p>
          <p>如果这个工具对你有帮助，欢迎请我喝杯咖啡 ☕</p>
          <p>你的支持是我持续更新的动力 ❤️</p>
        </div>
        <img
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/收款码1.12.png"
          alt="捐赠二维码"
          className="modal-qrcode"
        />
        <p className="modal-hint">扫码支持，感谢你的慷慨 ❤️</p>
      </Modal>
    </>
  )
}

