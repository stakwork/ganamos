import Image from "next/image"

interface BitcoinLogoProps {
  size?: number
  className?: string
}

export function BitcoinLogo({ size = 16, className = "" }: BitcoinLogoProps) {
  return (
    <div className={`relative w-${size / 4} h-${size / 4} ${className}`}>
      <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={size} height={size} className="object-contain" />
    </div>
  )
}
