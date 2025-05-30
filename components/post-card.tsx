import type React from "react"

interface PostCardProps {
  title: string
  content: string
  location?: string
  imageUrl?: string
}

const PostCard: React.FC<PostCardProps> = ({ title, content, location, imageUrl }) => {
  const locationName = location

  return (
    <div className="post-card">
      {imageUrl && <img src={imageUrl || "/placeholder.svg"} alt={title} className="post-card__image" />}
      <h2 className="post-card__title">{title}</h2>
      <p className="post-card__content">{content}</p>
      <div className="post-card__location">
        {locationName ? locationName.split(",")[0] : location ? location.split(",")[0] || location : "Unknown"}
      </div>
    </div>
  )
}

export default PostCard
