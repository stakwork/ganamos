import { QRCodeSVG } from "qrcode.react"

interface QRCodeProps {
  data: string
  size?: number
  bgColor?: string
  fgColor?: string
  level?: string
  includeMargin?: boolean
}

export default function QRCode({
  data,
  size = 200,
  bgColor = "#ffffff",
  fgColor = "#000000",
  level = "L",
  includeMargin = false,
}: QRCodeProps) {
  return (
    <div className="flex justify-center">
      <QRCodeSVG
        value={data}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level as "L" | "M" | "Q" | "H"}
        includeMargin={includeMargin}
      />
    </div>
  )
}
