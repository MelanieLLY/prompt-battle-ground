## Test Group A：

  A1 set + get basic

  set("a","1")

  get("a") → "1"

  A2 overwrite existing key

  set("a","1")

  set("a","2")

  get("a") → "2"

  A3 delete removes key

  set("a","1")

  delete("a")

  get("a") → undefined

  A4 clear empties cache

  set("a","1"), set("b","2")

  clear()

  get("a") / get("b") → undefined

  A5 size reflects entries

  set("a"), set("b")

  size() === 2

## 🧪 Test Group B：TTL

  B1 TTL not expired yet

  set("a","1", ttl=5000)

  advance time +3000 (or wait)

  get("a") → "1"

  B2 TTL expired

  set("a","1", ttl=3000)

  advance time +4000

  get("a") → undefined

  B3 expired entry removed on get

  set("a","1", ttl=1000)

  advance +2000

  get("a") → undefined

  size() === 0

  B4 expired entry removed on set cleanup

  set("a","1", ttl=1000)

  advance +2000

  set("b","2")

  cache should not contain "a"

  B5 defaultTTL used when ttlMs not provided

  defaultTTL=3000

  set("a","1")

  advance +4000

  get("a") → undefined

  B6 custom ttl overrides defaultTTL

  defaultTTL=10000

  set("a","1", ttl=2000)

  advance +3000

  get("a") → undefined

## 🧪 Test Group C：LRU

  C1 no eviction when under capacity

  maxSize=3

  set A,B

  size() === 2

  C2 evict LRU on overflow

  maxSize=3

  set A,B,C

  set D

  cache does NOT contain A

  C3 get refreshes recency

  maxSize=3

  set A,B,C

  get A

  set D

  cache evicts B (not A)

  C4 set refreshes recency

  maxSize=3

  set A,B,C

  set A (overwrite)

  set D

  cache evicts B

  C5 LRU order visible

  after operations, displayed order is MRU → LRU

  C6 eviction removes exactly one entry

  overflow by one

  size() === maxSize

  C7 LRU respects get on expired key

  set A ttl=1000

  advance +2000

  get A (expired)

  set B,C,D

  eviction should not count A

## 🧪 Test Group D：Persistence

  D1 persist after set

  set A

  localStorage contains serialized cache

  D2 load restores non-expired entries

  set A,B

  reload cache

  get A,B → values

  D3 expired entries not restored

  set A ttl=1000

  advance +2000

  reload cache

  get A → undefined

  D4 corrupted storage handled safely

  manually put invalid JSON in localStorage

  reload cache

  cache initializes empty, no crash
