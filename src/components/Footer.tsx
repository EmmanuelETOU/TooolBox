import styles from './Footer.module.css'
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>ToolBox — Plateforme interne &nbsp;·&nbsp; <span className={styles.accent}>Powered by Orange</span></p>
    </footer>
  )
}
