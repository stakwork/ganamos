import { BitcoinLogoClient } from "./bitcoin-logo-client"

interface BitcoinLogoProps {
  className?: string
  size?: number
}

export function BitcoinLogo({ className, size }: BitcoinLogoProps) {
  return (
    <div className={className} style={size ? { width: size, height: size } : undefined}>
      <BitcoinLogoClient className={className} size={size} />
    </div>
  )
}
