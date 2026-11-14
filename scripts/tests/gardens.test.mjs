import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evidence } from '../../site/core/evidence.js'
import { GARDEN_GRADES, gmAssessGarden, gmAssessmentKey, gmMapPresentation, gmMapStyle, gmMigrateRecords, gmNormalizeSnapshot, gmProfileDefaults, gmProfileSoil, gmVisibleGardens } from '../../site/logic/gardenModel.js'
import { DS, dsAdd, dsApplySnapshot, dsSaveGroup, dsSaveGarden, dsSelectGarden, dsDeleteGarden, dsDeleteGroup, dsSnapshot } from '../../site/sources/dataStore.js'
import { mwFuzzySearchPlace, mwPlaceCatalog, psDamerau } from '../../site/logic/placeSearch.js'
import { PROVINCES } from '../../site/data/provinces.js'
import { MEKONG_PROVINCES_GEO } from '../../site/data/mekongBoundaries.js'
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

test('chọn một vườn không làm mất vườn khác trên bản đồ; các vườn còn lại là ngữ cảnh',()=>{
  const gardens=[garden('a'),garden('b'),{...garden('c'),groupId:'g2'}]
  const map=gmMapPresentation(gardens,{mode:'garden',id:'b'})
  assert.equal(map.length,3)
  assert.deepEqual(map.filter(p=>p.focused).map(p=>p.garden.id),['b'])
  assert.deepEqual(map.filter(p=>!p.focused).map(p=>p.garden.id),['a','c'])
  assert.equal(map.at(-1).garden.id,'b','vườn được chọn được vẽ sau để dễ bấm')
})

test('chọn nhóm giữ vườn nhóm khác và đánh dấu đúng vườn có bản nháp sửa ranh',()=>{
  const gardens=[garden('a'),garden('b'),{...garden('c'),groupId:'g2'}, {...garden('no-shape'),polygon:null}]
  const map=gmMapPresentation(gardens,{mode:'group',id:'g1'},'b')
  assert.equal(map.length,3)
  assert.deepEqual(map.filter(p=>p.focused).map(p=>p.garden.id),['a','b'])
  assert.equal(map.find(p=>p.garden.id==='c').focused,false)
  assert.equal(map.find(p=>p.garden.id==='b').editing,true)
  assert.equal(map.filter(p=>p.editing).length,1)
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

test('xóa nhóm vườn xóa luôn tất cả vườn trong nhóm và dữ liệu gắn với các vườn đó',()=>{
  dsApplySnapshot(null)
  dsSaveGroup({id:'g1',name:'Nhóm 1',color:'#627cdb'})
  dsSaveGroup({id:'g2',name:'Nhóm 2',color:'#508261'})
  dsSaveGarden({...garden('ga1'),groupId:'g1'})
  dsSaveGarden({...garden('ga2'),groupId:'g1'})
  dsSaveGarden({...garden('gb1'),groupId:'g2'})
  DS.soil=[{id:'s1',gardenId:'ga1'},{id:'s2',gardenId:'ga2'},{id:'s3',gardenId:'gb1'}]
  DS.marks=[{id:'m1',gardenId:'ga1'},{id:'m2',gardenId:'gb1'}]
  DS.uploads=[{id:'u1',gardenId:'ga2'},{id:'u2',gardenId:'gb1'}]
  dsSelectGarden('ga1')
  dsDeleteGroup('g1')
  assert(!DS.gardenGroups.some(g=>g.id==='g1'))
  assert(DS.gardenGroups.some(g=>g.id==='g2'))
  assert.deepEqual(DS.gardens.map(g=>g.id),['gb1'])
  assert.deepEqual(DS.soil.map(r=>r.id),['s3'])
  assert.deepEqual(DS.marks.map(r=>r.id),['m2'])
  assert.deepEqual(DS.uploads.map(r=>r.id),['u2'])
  assert.equal(DS.activeGardenId,'gb1')
  dsDeleteGroup('g2')
  assert.equal(DS.activeGardenId,null)
})

test('vườn KHÔNG được chọn vẫn mang màu mức phù hợp thật, không bị ép xám',()=>{
  // Vườn a tốt (pH 6 → xanh), vườn b pH 3 (đỏ). Đang chọn vườn b; vườn a nằm ngoài bộ lọc.
  const gardens=[garden('a',{ph:6}),garden('b',{ph:3})]
  const map=gmMapPresentation(gardens,{mode:'garden',id:'b'})
  const a=map.find(p=>p.garden.id==='a'), b=map.find(p=>p.garden.id==='b')
  assert.equal(a.focused,false)
  const gradeA=gmAssessGarden({garden:a.garden,climate}).grade
  const gradeB=gmAssessGarden({garden:b.garden,climate}).grade
  assert.equal(gradeA,'green'); assert.equal(gradeB,'red')
  const styleA=gmMapStyle({grade:gradeA,active:false,focused:a.focused})
  const styleB=gmMapStyle({grade:gradeB,active:true,focused:b.focused})
  assert.equal(styleA.fillColor,GARDEN_GRADES.green,'vườn không chọn giữ màu xanh thật')
  assert.notEqual(styleA.fillColor,GARDEN_GRADES.gray)
  assert.equal(styleB.fillColor,GARDEN_GRADES.red)
  assert(styleB.weight>styleA.weight && styleB.fillOpacity>styleA.fillOpacity,'vườn đang chọn chỉ đậm hơn')
  // Khi chưa chọn vườn nào, mọi vườn vẫn có màu đánh giá (không chỉ viền mờ).
  const none=gmMapStyle({grade:gradeA})
  assert.equal(none.fillColor,GARDEN_GRADES.green)
  assert(none.fillOpacity>=0.3)
  // Chỉ xám khi chính vườn thiếu thông tin.
  assert.equal(gmMapStyle({grade:gmAssessGarden({garden:garden('c',{cropId:null}),climate}).grade}).fillColor,GARDEN_GRADES.gray)
})

test('tìm kiếm "Tìm ở đây": khớp có dấu, không dấu, tiền tố hành chính và sửa lỗi chính tả cơ bản',()=>{
  const cat=mwPlaceCatalog(PROVINCES,MEKONG_PROVINCES_GEO,'vi')
  const find=q=>mwFuzzySearchPlace(q,cat)
  // Có dấu / không dấu / tiền tố hành chính
  assert.equal(find('Cần Thơ')?.id,'cantho')
  assert.equal(find('Can Tho')?.id,'cantho')
  assert.equal(find('tp Cần Thơ')?.id,'cantho')
  assert.equal(find('Thành phố Cần Thơ')?.id,'cantho')
  assert.equal(find('Co Do')?.id,'cantho')
  assert.equal(find('Huyện Thoại Sơn')?.id,'angiang')
  // Sai dấu, gõ nhầm 1 chữ, đảo 2 chữ liền kề
  assert.equal(find('Cân Thơ')?.id,'cantho')
  assert.equal(find('Cần Thư')?.id,'cantho')
  assert.equal(find('An Giagn')?.id,'angiang')
  assert.equal(find('Soc Trnag')?.id,'soctrang')
  assert.equal(find('Dong Thpa')?.id,'dongthap')
  // Tỉnh ngoài 5 huyện mẫu: tìm được nhưng KHÔNG mang id (tránh districtInputs với id lạ)
  const la=find('Tỉnh Long An')
  assert.equal(la?.code,'longan'); assert.equal(la?.id,undefined)
  assert.equal(find('Ca Mau')?.code,'camau')
  // Chuỗi quá ngắn hoặc rác thì trả null
  assert.equal(find('x'),null)
  assert.equal(find(''),null)
  assert.equal(find('xyzxyz'),null)
  assert.equal(find('qwerty'),null)
  // Khoảng cách Damerau-Levenshtein: đảo 2 chữ = 1
  assert.equal(psDamerau('angiagn','angiang'),1)
  assert.equal(psDamerau('cantho','canthu'),1)
})
