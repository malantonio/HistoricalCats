const request = require('./dpla-request')
const { max_stored_entries } = require('../app-config')
const random = max => Math.ceil(Math.random() * max)

const randomWithBlacklist = (max, blacklist) => {
  if (max === blacklist.size) {
    throw new Error('blacklist is full')
  }
  
  let rand
  do {
    rand = random(max)
  } while (blacklist.has(rand))

  return rand
}

module.exports = (query, {type, field, blacklist, api_key}) => {
  const saveEntryToBlacklist = response => new Promise((resolve, reject) => {
    blacklist.add(response.start)
    
    if (max_stored_entries) {
      blacklist.resize(max_stored_entries)
    }
    
    blacklist.save(err => {
      if (err) return reject(err)
      return resolve(response)
    })
  })
  
  return request(query, {type, field, api_key})
    // first get the count
    .then(json => json.count)
    
    // then determine a random entry (that isn't in our blacklist)
    .then(total => randomWithBlacklist(total, blacklist))

    // then _get_ that entry
    .then(num => request(query, {type, field, api_key, page: num}))

    // store the entry # 
    // (`results.start`, since we're limiting `page_size` to 1)
    .then(saveEntryToBlacklist)

    // then get the entry out of there
    .then(results => results.docs[0])
}