import { test } from 'node:test'
import assert from 'node:assert/strict'
import { powerReadCache, powerWriteCache } from '../../site/sources/power.js'

test('hai vườn trong cùng ô làm tròn cũ không ghi đè môi trường của nhau',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  const values=new Map()
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}})
  try {
    const a={lat:10.101,lon:105.431,marker:'garden-a'}
    const b={lat:10.102,lon:105.432,marker:'garden-b'}
    powerWriteCache(a);powerWriteCache(b)
    assert.equal(powerReadCache(a.lat,a.lon).marker,'garden-a')
    assert.equal(powerReadCache(b.lat,b.lon).marker,'garden-b')
    values.clear()
    values.set('mvm-power-v1-10.10_105.43',JSON.stringify(a))
    assert.equal(powerReadCache(b.lat,b.lon),null,'không nhận bản môi trường cũ thuộc vườn lân cận')
    assert.equal(powerReadCache(a.lat,a.lon).marker,'garden-a','vẫn nhận cache cũ nếu đúng tọa độ')
  } finally {
    if(previous)Object.defineProperty(globalThis,'localStorage',previous)
    else delete globalThis.localStorage
  }
})
