# PolyAnalyzer

Polymarket 트레이더 분석 대시보드. 지갑 주소나 유저네임을 입력하면 거래 패턴, 수익률, 헷징 전략 등을 시각적으로 분석합니다.

## Features

- **PnL Analysis** — 실현/미실현 손익, 누적 PnL 차트 (Polymarket 공식 PnL 스크래핑)
- **Win Rate** — 승률, 연승/연패, 기대값
- **Hedge Strategy Deep Dive**
  - Pair Cost 분석 (YES+NO 합산 비용)
  - 레그별 진입가 분포 (First Leg vs Second Leg)
  - YES/NO 가격 스프레드 패턴 (Scatter Plot)
  - 시간-가격 상관관계 (타이밍별 Pair Cost 비교)
  - 헷징 타이밍 분석 (Simultaneous / Quick / Gradual / Delayed)
  - 헷징 효율성 (투입 자본 대비 ROI)
  - 헷징 vs 단방향 마켓 성과 비교
- **Timing Heatmap** — 요일/시간별 거래 패턴
- **Category Breakdown** — 마켓 카테고리별 성과
- **Direction Bias** — YES/NO 방향 편향 분석
- **Entry Price Analysis** — 진입가별 승률/PnL

## Tech Stack

- Next.js 14 (App Router, Server Components)
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts

## Getting Started

```bash
npm install
npm run dev
```

http://localhost:3000 접속 후 Polymarket 유저네임 또는 지갑 주소 입력.

## Data Limitations

- Polymarket API의 offset 제한으로 trades는 최대 ~2,000건, closed positions는 최대 ~2,000건만 로드됩니다.
- 총 PnL은 Polymarket 프로필 페이지에서 공식 값을 가져와 정확하게 표시합니다.
- 프로필 헤더에 로드된 데이터의 기간이 표시됩니다.
