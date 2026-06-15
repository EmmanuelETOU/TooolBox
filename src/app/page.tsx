import Link from 'next/link'
import styles from './page.module.css'

const TOOLS = [
  {
    id: 'split-excel',
    name: 'Split Excel / CSV',
    description: 'Découpez vos fichiers en plusieurs parties avec un nombre de lignes configurable et des colonnes standardisées.',
    icon: '✂️',
    route: '/tools/split-excel',
    available: true,
  },
  {
    id: 'merge-csv',
    name: 'Fusion CSV',
    description: 'Fusionnez plusieurs fichiers CSV en un seul fichier unifié.',
    icon: '📊',
    route: '#',
    available: false,
  },
  {
    id: 'converter',
    name: 'Convertisseur',
    description: 'Convertissez entre les formats CSV, Excel et JSON.',
    icon: '🔄',
    route: '#',
    available: false,
  },
  {
    id: 'cleaner',
    name: 'Nettoyeur de données',
    description: 'Supprimez les doublons et normalisez vos colonnes automatiquement.',
    icon: '🧹',
    route: '#',
    available: false,
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Plateforme d&apos;outils internes</p>
          <h1 className={styles.heroTitle}>
            Vos outils,<br />
            <span className={styles.accent}>un seul endroit.</span>
          </h1>
          <p className={styles.heroSub}>
            Automatisez vos tâches répétitives sans effort. Choisissez un outil ci-dessous.
          </p>
        </div>
        <div className={styles.heroStripe} />
      </section>

      <section className={styles.toolsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Outils disponibles</span>
          <h2 className={styles.sectionTitle}>
            {TOOLS.filter(t => t.available).length} outil actif · {TOOLS.filter(t => !t.available).length} à venir
          </h2>
        </div>

        <div className={styles.grid}>
          {TOOLS.map(tool => (
            tool.available ? (
              <Link key={tool.id} href={tool.route} className={styles.card}>
                <div className={styles.cardIcon}>{tool.icon}</div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{tool.name}</h3>
                  <p className={styles.cardDesc}>{tool.description}</p>
                </div>
                <span className={styles.cardArrow}>→</span>
              </Link>
            ) : (
              <div key={tool.id} className={`${styles.card} ${styles.cardSoon}`}>
                <div className={`${styles.cardIcon} ${styles.muted}`}>{tool.icon}</div>
                <div className={styles.cardBody}>
                  <h3 className={`${styles.cardName} ${styles.muted}`}>{tool.name}</h3>
                  <p className={`${styles.cardDesc} ${styles.muted}`}>{tool.description}</p>
                </div>
                <span className={styles.badgeSoon}>Bientôt</span>
              </div>
            )
          ))}
        </div>
      </section>
    </div>
  )
}
