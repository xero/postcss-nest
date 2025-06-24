import type { Plugin } from "postcss"
export interface PostcssNestOptions {
  nestDescendants?:boolean
  collapseNestedSiblings?:boolean
  factorCommonProps?:boolean
  nestPseudos?:boolean
}
declare const postcssNest:(opts?:PostcssNestOptions)=>Plugin
export default postcssNest
