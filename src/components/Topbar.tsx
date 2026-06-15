'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Topbar.module.css'

export default function Topbar() {
  const path = usePathname()
  return (
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandIcon}>⚙</span>
        <span className={styles.brandName}>
          Tool<span className={styles.accent}>Box</span>
        </span>
      </Link>
      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navLink} ${path === '/' ? styles.active : ''}`}>
          Accueil
        </Link>
      </nav>
    </header>
  )
}
