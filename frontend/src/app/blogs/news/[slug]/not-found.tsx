import Link from 'next/link';
import styles from '@/components/Journal.module.css';

export default function ArticleNotFound() {
  return <div className={`${styles.journalPage} ${styles.notFound}`}><p className={styles.eyebrow}>THE GREETOS JOURNAL</p><h1>This story could not be found.</h1><p>Explore our latest guides to fresh produce and everyday cooking.</p><Link href="/blogs/news" className={styles.outlineLink}>Back to the journal <span aria-hidden="true">→</span></Link></div>;
}
