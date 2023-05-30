const { watch } = require('node:fs')

watch('index.jsx', (e, filename) => {
  console.log(Date.now(), filename)
})

watch('src/d0/d0/d0/d0/f0.jsx', (e, filename) => {
  console.log(Date.now(), filename)
})