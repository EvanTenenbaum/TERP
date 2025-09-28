'use client'
import React from 'react'

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
      {message}
    </div>
  )
}
