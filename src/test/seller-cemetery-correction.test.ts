import { describe, expect, it, vi } from "vitest";
import { applyCemeteryCorrection, correctionTarget } from "../../supabase/functions/seller-agent/cemeteryCorrection";
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
  it("retries unfinished unsigned documents even after the cemetery was saved, never changes signed copies", async()=>{
    const old={id:"unsigned",kind:"poa",status:"draft",fill_data:{cemetery:"Wrong cemetery"}};
    const signed={id:"signed",kind:"poa",status:"signed",signed_at:"2026-11-06",fill_data:{cemetery:"Wrong cemetery"}};
    const db={from:(table:string)=>{
      const q:any={select:()=>q,order:()=>q,eq:()=>q,is:()=>q,neq:()=>q,range:async()=>({data:rows,error:null}),then:(resolve:any)=>resolve({data:[old,signed],error:null})}; return q;
    }};
    const generate=vi.fn().mockResolvedValue({ok:true});
    const result=await applyCemeteryCorrection(db,{id:"seller",cemetery:"Restland Memorial Park",cemetery_city:"Dallas"},{cemetery:"Restland Cemetery",city:"Dallas"},"action","AI",generate);
    expect(result.rebuilt).toBe(1);
    expect(generate).toHaveBeenCalledWith({submission_id:"seller",kind:"poa",overrides:{cemetery:"Restland Memorial Park",county_state:"Dallas, TX",county:"Dallas, TX",supersede_contract_id:"unsigned"}});
  });
});