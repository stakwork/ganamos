"use client"

import { useState } from "react"
import { Container, Typography, Button, Stack, Box, TextField, Alert, IconButton, Collapse } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"
import FavoriteIcon from "@mui/icons-material/Favorite"

export default function Home() {
  const [open, setOpen] = useState(true)
  const [liked, setLiked] = useState(false)

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Our Community!
        </Typography>
        <Typography variant="body1" paragraph>
          Join us in building a better future together. We believe in the power of community and collaboration.
        </Typography>

        <Collapse in={open}>
          <Alert
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  setOpen(false)
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{ mb: 2 }}
          >
            New! Check out our latest initiatives.
          </Alert>
        </Collapse>

        <Stack spacing={2} direction="row">
          <Button variant="contained" color="primary">
            Create Account
          </Button>
          <Button variant="outlined" color="primary" size="small">
            Boost Your Community
            <IconButton onClick={() => setLiked(!liked)}>
              {liked ? (
                <FavoriteIcon sx={{ fontSize: 15, ml: 0.5 }} />
              ) : (
                <FavoriteBorderIcon sx={{ fontSize: 15, ml: 0.5 }} />
              )}
            </IconButton>
          </Button>
        </Stack>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Stay Updated
          </Typography>
          <TextField label="Enter your email" variant="outlined" fullWidth margin="normal" />
          <Button variant="contained">Subscribe</Button>
        </Box>
      </Box>
    </Container>
  )
}
