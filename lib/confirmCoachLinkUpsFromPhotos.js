export async function confirmCoachLinkUpsFromPhotos({ token, images, coachId = null }) {
  const shots = (Array.isArray(images) ? images : [])
    .filter((image) => image?.type === 'connection' || image?.type === 'connection2')
    .map((image) => image.dataUrl)
    .filter(Boolean)
    .slice(0, 2)

  if (!token || shots.length === 0) return { saved: false, count: 0 }

  const extractRes = await fetch('/api/tactical/extract-coach-link-ups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ images: shots })
  })
  const extractData = await extractRes.json().catch(() => ({}))
  if (!extractRes.ok) {
    throw new Error(extractData.error || 'Unable to read coach Link-ups')
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('credits-consumed'))
  }

  const plays = Array.isArray(extractData.link_up_plays) ? extractData.link_up_plays : []
  if (!plays.length) return { saved: false, count: 0 }

  const saveRes = await fetch('/api/tactical/coach-link-ups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      coach_id: coachId || undefined,
      link_up_plays: plays,
      source: 'user_screenshot_confirmed'
    })
  })
  const saveData = await saveRes.json().catch(() => ({}))
  if (!saveRes.ok) {
    throw new Error(saveData.error || 'Unable to save coach Link-ups')
  }

  return {
    saved: true,
    count: Array.isArray(saveData.link_up_plays) ? saveData.link_up_plays.length : plays.length
  }
}
