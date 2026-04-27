// Shared resolver for cemetery + plot type images.
// Extracted from Properties.tsx so the admin can use the same visuals.

import singlePlotImg from "@/assets/property-types/single-plot.png";
import singlePlotX2Img from "@/assets/property-types/single-plot-x2.png";
import singlePlotX3Img from "@/assets/property-types/single-plot-x3.png";
import singlePlotX4Img from "@/assets/property-types/single-plot-x4.png";
import companionPlotImg from "@/assets/property-types/companion-plot.png";
import lawnCryptImg from "@/assets/property-types/lawn-crypt.png";
import lawnCryptX2Img from "@/assets/property-types/lawn-crypt-x2.png";
import mausoleumImg from "@/assets/property-types/mausoleum.png";
import mausoleumX2Img from "@/assets/property-types/mausoleum-x2.png";
import mausoleumX3Img from "@/assets/property-types/mausoleum-x3.png";
import cremationNicheImg from "@/assets/property-types/cremation-niche.png";
import cremationNicheX2Img from "@/assets/property-types/cremation-niche-x2.png";
import cremationNicheX3Img from "@/assets/property-types/cremation-niche-x3.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import veteransX1Img from "@/assets/property-types/veterans-x1.png";
import veteransX2Img from "@/assets/property-types/veterans-x2.png";
import veteransX3Img from "@/assets/property-types/veterans-x3.png";

import defaultCemImg from "@/assets/cemeteries/default-cemetery.png";
import hillsideCemImg from "@/assets/cemeteries/hillside-cemetery.png";
import mausoleumCemImg from "@/assets/cemeteries/mausoleum-cemetery.png";
import chapelCemImg from "@/assets/cemeteries/chapel-cemetery.png";
import naturalCemImg from "@/assets/cemeteries/natural-cemetery.png";
import italianCemImg from "@/assets/cemeteries/italian-cemetery.png";
import greekCemImg from "@/assets/cemeteries/greek-cemetery.png";

export const getCemeteryImage = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("chapel") || n.includes("chimes") || n.includes("columbarium")) return chapelCemImg;
  if (n.includes("italian")) return italianCemImg;
  if (n.includes("greek") || n.includes("orthodox")) return greekCemImg;
  if (n.includes("mt.") || n.includes("mount") || n.includes("mountain view") || n.includes("hilltop") || n.includes("rolling hills")) return hillsideCemImg;
  if (n.includes("fernwood") || n.includes("natural") || n.includes("oak") || n.includes("evergreen") || n.includes("lone tree")) return naturalCemImg;
  if (n.includes("holy") || n.includes("mission") || n.includes("st.") || n.includes("queen") || n.includes("all souls") || n.includes("sepulchre")) return mausoleumCemImg;
  if (n.includes("sunset") || n.includes("sunrise") || n.includes("skyview")) return hillsideCemImg;
  return defaultCemImg;
};

export const getPlotImage = (plotType: string, spaces: number): string => {
  const type = (plotType || "").toLowerCase();

  if (type.includes("veteran")) {
    if (spaces >= 3) return veteransX3Img;
    if (spaces === 2) return veteransX2Img;
    return veteransX1Img;
  }
  if (type.includes("companion") || type.includes("double")) {
    if (spaces >= 4) return singlePlotX4Img;
    if (spaces >= 3) return singlePlotX3Img;
    return companionPlotImg;
  }
  if (type.includes("family") || type.includes("estate")) return familyEstateImg;
  if (type.includes("mausoleum") || type.includes("crypt")) {
    if (spaces >= 3) return mausoleumX3Img;
    return spaces >= 2 ? mausoleumX2Img : mausoleumImg;
  }
  if (type.includes("niche") || type.includes("cremation")) {
    if (spaces >= 3) return cremationNicheX3Img;
    return spaces >= 2 ? cremationNicheX2Img : cremationNicheImg;
  }
  if (type.includes("lawn")) {
    return spaces >= 2 ? lawnCryptX2Img : lawnCryptImg;
  }
  if (spaces >= 4) return singlePlotX4Img;
  if (spaces >= 3) return singlePlotX3Img;
  if (spaces >= 2) return singlePlotX2Img;
  return singlePlotImg;
};
