"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface PriceFlashCellProps {
  value: number
  displayValue: string | React.ReactNode
  className?: string
}

export function PriceFlashCell({ value, displayValue, className }: PriceFlashCellProps) {
  const [flashColor, setFlashColor] = useState<"green" | "red" | "transparent">("transparent")
  const [prevValue, setPrevValue] = useState(value)

  if (!Object.is(value, prevValue)) {
    setPrevValue(value)
    if (isFinite(value) && isFinite(prevValue)) {
      setFlashColor(value > prevValue ? "green" : "red")
    }
  }

  useEffect(() => {
    if (flashColor !== "transparent") {
      const timer = setTimeout(() => {
        setFlashColor("transparent")
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [flashColor])

  const backgroundColor =
    flashColor === "green"
      ? "rgba(111, 207, 151, 0.2)"
      : flashColor === "red"
      ? "rgba(235, 87, 87, 0.2)"
      : "transparent"

  return (
    <motion.div
      initial={{ backgroundColor: "transparent" }}
      animate={{ backgroundColor }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {displayValue}
    </motion.div>
  )
}
