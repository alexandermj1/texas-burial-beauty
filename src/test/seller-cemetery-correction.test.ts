import { describe, expect, it } from "vitest";
import { correctionTarget } from "../../supabase/functions/seller-agent/cemeteryCorrection";
const rows=[{id:"a",name:"Forest Park Westheimer",city:"Houston"},{id:"b",name:"Restland Memorial Park",city:"Dallas"}];
describe("seller cemetery correction",()=>{
  it("matches cemetery/park variants instead of creating duplicates",()=>{
    expect(correctionTarget({cemetery:"Restland Cemetery",city:"Dallas"},rows)).toEqual({existing:rows[1]});
  });
  it("rejects contradictory cities and ambiguous same-name places",()=>{
    expect(()=>correctionTarget({cemetery:"Restland Cemetery",city:"Houston"},rows)).toThrow();
    expect(()=>correctionTarget({cemetery:"Restland Cemetery"},[...rows,{id:"c",name:"Restland Cemetery",city:"Austin"}])).toThrow();
  });
  it("requires intent, city and evidence for a truly missing cemetery",()=>{
    const f={cemetery:"Bluebonnet Hills Memorial Park",city:"Colleyville",evidence:"Seller deed identifies Bluebonnet Hills in Colleyville",create_if_missing:"true"};
    expect(correctionTarget(f,rows)).toEqual({create:{name:f.cemetery,city:f.city,address:null}});
    expect(()=>correctionTarget({...f,evidence:""},rows)).toThrow();
    expect(()=>correctionTarget({...f,create_if_missing:"false"},rows)).toThrow();
  });
  it("blocks creation against retired and similar registry profiles",()=>{
    expect(()=>correctionTarget({cemetery:"Restland Cemetery",city:"Dallas"},[{...rows[1],deleted_at:"2026-11-06"}])).toThrow();
    expect(()=>correctionTarget({cemetery:"Forest Park East",city:"Houston",create_if_missing:"true",evidence:"Deed identifies this cemetery at the stated city"},rows)).toThrow();
  });
});