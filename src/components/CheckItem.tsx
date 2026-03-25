import { useState, useCallback } from 'react'
import './CheckItem.css'

interface CheckItemProps {
  text: string
  checked: boolean
  index: number
  disabled?: boolean
  onToggle: () => void
  onEdit?: () => void
}

export function CheckItem({ text, checked, index, disabled, onToggle, onEdit }: CheckItemProps) {
  const [animating, setAnimating] = useState(false)

  const handleClick = useCallback(() => {
    if (disabled) return
    if (!checked) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }
    onToggle()
  }, [disabled, onToggle, checked])

  const cls = [
    'check-item',
    checked && 'check-item--checked',
    animating && 'check-item--animate',
    disabled && 'check-item--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="check-item__box">
        <svg
          className="check-item__checkmark"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M3 8.5l3.5 3.5L13 5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="check-item__text">{text}</span>
      {onEdit && (
        <button
          className="check-item__edit"
          title="Edit (requires 3-day streak)"
          onClick={e => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <span className="check-item__number">{index + 1}</span>
    </div>
  )
}
