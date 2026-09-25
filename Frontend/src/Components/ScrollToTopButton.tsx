import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTopButton() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      isScrollingRef.current = true
      setIsVisible(false)

      clearTimeout(timer)
      timer = setTimeout(() => {
        if (window.scrollY > 300) {
          setIsVisible(true)
        }
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      document.removeEventListener('scroll', handleScroll, { capture: true })
      clearTimeout(timer)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 group transition-all duration-500 ease-out transform ${isVisible
          ? 'opacity-100 pointer-events-auto translate-y-0 scale-100'
          : 'opacity-0 pointer-events-none translate-y-8 scale-90'
        }`}
    >
      <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none select-none px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gray-900/90 dark:bg-gray-100/90 dark:text-gray-900 shadow-lg backdrop-blur-md whitespace-nowrap">
        {t('Scroll to top')}
      </span>

      <button
        onClick={scrollToTop}
        title={t('Scroll to top')}
        aria-label={t('Scroll to top')}
        className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-110 active:scale-95 border shadow-xl backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary, #f97316) 0%, #ea580c 100%)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          color: '#ffffff',
          boxShadow: '0 8px 20px -4px rgba(249, 115, 22, 0.45)',
        }}
      >
        <ArrowUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1" />
      </button>
    </div>
  )
}
