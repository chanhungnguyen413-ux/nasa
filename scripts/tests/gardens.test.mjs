import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evidence } from '../../site/core/evidence.js'
import { gmAssessGarden, gmAssessmentKey, gmMigrateRecords, gmNormalizeSnapshot, gmProfileDefaults, gmProfileSoil, gmVisibleGardens } from '../../site/logic/gardenModel.js'
import { DS, dsAdd, dsApplySnapshot, dsSaveGroup, dsSaveGarden, dsSelectGarden, dsDeleteGarden, dsSnapshot } from '../../site/sources/dataStore.js'
import { fiBelongs } from '../../site/sources/farmerInput.js'
import { fdField } from '../../site/logic/fieldData.js'

const poly = [[10.1,105.43],[10.1,105.432],[10.102,105.432],[10.102,105.43]]
const garden = (id, profile = {}) => ({ id, groupId:'g1', name:id, lat:10.101, lon:105.431, polygon:poly, profile:{ ...gmProfileDefaults(), cropId:'tomato', sowing:1, irrigation:'yes', ph:6, measuredAt:'2026-11-14', ...profile } })
// Khí hậu giả chỉ dành cho kiểm tra; số hiển thị trong sản phẩm vẫn dùng nguồn thật.
const ev = (v,unit='mm') => evidence({ value:v,unit,kind:'model',source:'powerDaily' })
const climate = { months:Array.from({length:12},(_,i)=>({ month:i+1,rain:ev(200),rainDry:ev(180),gwetroot:ev(.5,'0–1'),tmax:ev(28,'°C'),tmin:ev(20,'°C') })) }

test('kho rỗng không tự tạo nhóm hay vườn minh họa',()=>{
  const s=gmNormalizeSnapshot(null)
  assert.deepEqual(s.gardens,[]); assert.deepEqual(s.gardenGroups,[])
})
test('vườn cũ được chuyển vào nhóm, giữ tên và ranh giới, không tự gán cây',()=>{
  const old={ id:'old',name:'Vườn cũ',polygon:poly,irrigation:'no' }
  const s=gmNormalizeSnapshot({gardens:[old]})
  assert.equal(s.gardens[0].groupId,s.gardenGroups[0].id)
  assert.deepEqual(s.gardens[0].polygon,poly)
  assert.equal(s.gardens[0].profile.cropId,null)
  assert.equal(s.gardens[0].profile.irrigation,'no')
})
test('bộ chọn nhóm chỉ trả vườn trong nhóm; bộ chọn vườn chỉ trả đúng vườn đó',()=>{
  const gardens=[garden('a'),{...garden('b'),groupId:'g2'}]
  assert.deepEqual(gmVisibleGardens(gardens,{mode:'group',id:'g1'}).map(g=>g.id),['a'])
  assert.deepEqual(gmVisibleGardens(gardens,{mode:'garden',id:'b'}).map(g=>g.id),['b'])
  assert.equal(gmVisibleGardens(gardens,{mode:'group',id:'*'}).length,2)
  const restored=gmNormalizeSnapshot({gardens,gardenGroups:[{id:'g1',name:'A',color:'#627cdb'},{id:'g2',name:'B',color:'#238d9b'}],gardenView:{mode:'garden',id:'removed'}})
  assert.deepEqual(restored.gardenView,{mode:'group',id:'g1'})
})
test('chưa chọn cây luôn là xám, kể cả đã có đủ đất và khí hậu',()=>{
  const r=gmAssessGarden({ garden:garden('a',{cropId:null}),climate })
  assert.equal(r.grade,'gray'); assert.equal(r.reason,'noCrop'); assert.equal(r.zones,null)
})
test('thiếu ranh, khí hậu hoặc lịch vụ đều giữ xám, không tự điền điều kiện',()=>{
  assert.equal(gmAssessGarden({garden:{...garden('a'),polygon:null},climate}).reason,'noBoundary')
  assert.equal(gmAssessGarden({garden:garden('a')}).reason,'noClimate')
  assert.equal(gmAssessGarden({garden:garden('a',{sowing:null}),climate}).reason,'noSeason')
})
test('cùng vị trí nhưng hồ sơ đất khác nhau cho vùng xanh/vàng/đỏ riêng',()=>{
  const assess=ph=>gmAssessGarden({garden:garden('a',{ph}),climate})
  assert.equal(assess(6).grade,'green')
  assert.equal(assess(7.2).grade,'yellow')
  assert.equal(assess(3).grade,'red')
})
test('đổi cây với cùng hồ sơ làm thay đổi tiêu chí phù hợp',()=>{
  const a=gmAssessGarden({garden:garden('a',{ph:7.2}),climate})
  const b=gmAssessGarden({garden:garden('a',{ph:7.2,cropId:'cabbage'}),climate})
  assert.equal(a.result.criteria.find(c=>c.key==='ph').grade,'yellow')
  assert.equal(b.result.criteria.find(c=>c.key==='ph').grade,'green')
})
test('số đo gắn vườn không lọt vào vườn sát cạnh hoặc cùng tọa độ',()=>{
  const b=garden('b'), a=garden('a',{ph:3})
  const measure=gmProfileSoil(a)[0]
  assert.equal(fiBelongs(measure,fdField({lat:b.lat,lon:b.lon},b.polygon,b.id)),false)
  const result=gmAssessGarden({garden:b,climate,soil:[measure]})
  assert.equal(result.grade,'green')
})

test('lưu pH trong settings phải thắng số đo cũ trong kho, kể cả ngày đo cũ hơn',()=>{
  const old={id:'old-ph',gardenId:'a',where:'field',lat:10.101,lon:105.431,date:'2026-11-14',ph:6}
  const saved=garden('a',{ph:3,measuredAt:'2026-11-01'})
  const result=gmAssessGarden({garden:saved,climate,soil:[old]})
  assert.equal(result.grade,'red')
  assert.equal(result.result.criteria.find(c=>c.key==='ph').numbers.ph,3)
})

test('điểm đất chưa gắn vườn không tự sinh zone trong vườn mới',()=>{
  const unrelated={id:'unowned',where:'point',lat:10.1002,lon:105.4302,date:'2026-11-14',ph:3}
  const result=gmAssessGarden({garden:garden('a'),climate,soil:[unrelated]})
  assert.equal(result.grade,'green')
  assert.equal(result.zones.uniform,true)
})

test('settings áp dụng cho cả vườn, không bị số đo điểm cũ che mất thay đổi',()=>{
  const point={id:'point-old',gardenId:'a',where:'point',lat:10.1002,lon:105.4302,date:'2026-11-14',ph:6}
  const result=gmAssessGarden({garden:garden('a',{ph:3}),climate,soil:[point]})
  assert(result.zones.cells.every(c=>c.result.criteria.find(v=>v.key==='ph').numbers.ph===3))
  assert.equal(result.zones.uniform,true)
})

test('cùng settings/môi trường luôn ra cùng zone; thay môi trường phải tính lại',()=>{
  const input={garden:garden('a'),climate}
  const first=gmAssessGarden(input)
  assert.deepEqual(gmAssessGarden(input),first)
  const hot={...climate,months:climate.months.map(m=>({...m,tmax:ev(40,'°C'),tmin:ev(36,'°C')}))}
  assert.notEqual(gmAssessmentKey({...input,climate:hot}),gmAssessmentKey(input))
  assert.equal(gmAssessGarden({...input,climate:hot}).grade,'red')
  assert.equal(gmAssessGarden(input).grade,'green')
  assert.equal(gmAssessmentKey({...input,garden:{...input.garden,name:'Đổi tên',groupId:'Đổi nhóm'}}),gmAssessmentKey(input))
})

test('dữ liệu cũ chỉ được gắn vào vườn khi vị trí thuộc duy nhất một vườn',()=>{
  const old={id:'legacy-point',where:'point',lat:10.1002,lon:105.4302,ph:3}
  assert.equal(gmMigrateRecords([old],[garden('a')])[0].gardenId,'a')
  assert.equal(gmMigrateRecords([old],[garden('a'),garden('b')])[0].gardenId,undefined)
  assert.equal(old.gardenId,undefined,'không sửa hay xóa dữ liệu gốc')
})
test('lưu/khôi phục nhóm và hồ sơ độc lập, đổi màu nhóm cập nhật màu dùng chung',()=>{
  dsApplySnapshot(null)
  const group=dsSaveGroup({name:'Nhóm A',color:'#627cdb'})
  const a=dsSaveGarden({...garden('a'),groupId:group.id})
  const b=dsSaveGarden({...garden('b'),groupId:group.id,profile:gmProfileDefaults(),lat:null,lon:null,polygon:null})
  dsSelectGarden(b.id); assert.equal(DS.field,null)
  dsSelectGarden(a.id); assert.equal(DS.gardens.find(g=>g.id==='a').profile.cropId,'tomato')
  assert.equal(DS.gardens.find(g=>g.id==='b').profile.cropId,null)
  dsSaveGroup({...group,color:'#c85e79'})
  assert(DS.gardens.every(g=>DS.gardenGroups.find(p=>p.id===g.groupId).color==='#c85e79'))
  const snapshot=JSON.parse(JSON.stringify(dsSnapshot()))
  dsApplySnapshot(snapshot)
  assert.equal(DS.gardens.length,2); assert.equal(DS.gardenGroups[0].color,'#c85e79')
})
test('xóa một vườn chỉ xóa số đo của vườn đó; giữ vườn và dữ liệu anh em',()=>{
  DS.soil=[{id:'sa',gardenId:'a'},{id:'sb',gardenId:'b'}]
  dsDeleteGarden('a')
  assert(!DS.gardens.some(g=>g.id==='a')); assert(DS.gardens.some(g=>g.id==='b'))
  assert.deepEqual(DS.soil,[{id:'sb',gardenId:'b'}])
})

test('phiếu đo cả vườn mới và settings dùng chung hồ sơ hiện hành',()=>{
  dsApplySnapshot(null)
  dsSaveGroup({id:'g1',name:'A',color:'#627cdb'})
  dsSaveGarden(garden('a'))
  dsAdd('soil',{where:'field',date:'2026-11-14',lat:10.101,lon:105.431,ph:3,ec:null,om:null})
  assert.equal(DS.gardens[0].profile.ph,3)
  assert.equal(gmAssessGarden({garden:DS.gardens[0],climate,soil:DS.soil}).grade,'red')
})
