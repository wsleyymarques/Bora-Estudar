// packages/tutorial-react/src/components/ProgressBar.tsx
import { clsx } from 'clsx'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  current: number
  total: number
  showNumbers?: boolean
  stepLabels?: string[]
}

export function ProgressBar({ current, total, showNumbers = true, stepLabels }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  
  return (
    <div className={styles.container} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={`Progresso: ${current} de ${total} passos`}>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
      {showNumbers && stepLabels && stepLabels.length > 0 && (
        <div className={styles.labels}>
          {stepLabels.map((label, i) => (
            <span key={i} className={clsx(styles.label, i < current && styles.completed, i === current && styles.current)}>
              {label}
            </span>
          ))}
        </div>
      )}
      <span className={styles.percentage} aria-hidden="true">{Math.round(percentage)}%</span>
    </div>
  )
}