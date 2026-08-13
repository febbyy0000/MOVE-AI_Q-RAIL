'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  isAdmin?: boolean
  userName?: string
}

export default function CommonHeader({
  isAdmin = false,
  userName = '현대글로비스 (홍길동 팀장)',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex justify-between items-center px-5 py-3.5 border-b-2 border-slate-100 bg-white">
      <Link
        href="/request"
        className={`font-extrabold text-base tracking-tight ${isAdmin ? 'text-violet-700' : 'text-blue-700'}`}
      >
        {isAdmin ? 'Q-RAIL Admin' : 'Q-RAIL'}
      </Link>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="bg-slate-50 border border-slate-300 px-3 py-1 rounded-full text-xs font-semibold text-slate-900 flex items-center gap-1.5 hover:bg-blue-50 hover:border-blue-400 transition-colors"
        >
          <span>👤 {userName}</span>
          <span className="text-[9px]">▼</span>
        </button>

        {open && (
          <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-xl w-60 z-50 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 text-[10.5px] font-bold text-slate-500">
              사용자 프로필 전환
            </div>
            {[
              { name: '홍길동 팀장 (현대글로비스)', role: '화주1' },
              { name: '김철수 부장 (LX판토스)', role: '화주2' },
              { name: '이영희 과장 (유신포워딩)', role: '화주3' },
            ].map((u) => (
              <button
                key={u.name}
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs border-b border-slate-100 hover:bg-blue-50 text-left"
              >
                <span>{u.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {u.role}
                </span>
              </button>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-violet-50 text-left"
            >
              <span>박관리자 (코레일)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-bold">
                관리자
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
