import React, { useRef, useEffect, useState } from 'react'
import './SVGText.css'

interface SVGTextProps {
  children: string
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  fontSize?: number
  fontWeight?: number | string
  className?: string
  style?: React.CSSProperties
}

export const SVGText: React.FC<SVGTextProps> = ({
  children,
  fillColor = '#000',
  strokeColor = '#fff',
  strokeWidth = 0,
  fontSize = 16,
  fontWeight = 'normal',
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLSpanElement>(null)
  const placeholderRef = useRef<HTMLSpanElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (placeholderRef.current) {
      const updateDimensions = () => {
        const rect = placeholderRef.current!.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
      updateDimensions()
      const resizeObserver = new ResizeObserver(updateDimensions)
      resizeObserver.observe(placeholderRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [children, fontSize, fontWeight])

  return (
    <span
      ref={containerRef}
      className={`svg-text-container ${className}`}
      style={style}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <svg
          className="svg-text"
          width={dimensions.width}
          height={dimensions.height}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={fontWeight}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            paintOrder="stroke fill"
          >
            {children}
          </text>
        </svg>
      )}
      {/* 占位文本，用于计算尺寸和保持布局 */}
      <span
        ref={placeholderRef}
        className="svg-text-placeholder"
        style={{
          fontSize,
          fontWeight,
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {children}
      </span>
    </span>
  )
}

