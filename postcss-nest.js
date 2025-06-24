// postcss-nest: "the opposite of every other css nesting plugin"
// produces beautiful, modern, minimal, maintainable, nested css.
//
// features:
// - aggressive property-level factoring: merges all common props among siblings into grouped selectors.
// - block-level sibling merging: collapses all identical sibling blocks.
// - pseudo-class/element nesting: nests pseudo rules as `&:pseudo` only when appropriate.
// - descendant nesting: nests descendant selectors.
// - recurses for @media and deep level nesting.
// - options to enable/disable key passes via the opts object.

const x=0,
// split a selector string into an array of selectors (comma-separated)
splitSelectors=s=>s.split(',').map(e=>e.trim()).filter(Boolean),
// array dedupe
unique=a=>Array.from(new Set(a)),
// key for comparing declarations
declKey=d=>`${d.prop}:${d.value}`,
// Helper to create an empty rule node based on an existing rule or root
makeRule=(base,selector)=>{
  // base is a Rule or Root node
  let r=null
  if(base&&base.type==="rule") {
    r=base.clone({selector,nodes:[]})
  }else if(base && base.nodes && base.nodes.length) {
    // try to find a rule to clone
    for(let node of base.nodes) {
      if(node.type==="rule") {
        r=node.clone({selector,nodes:[]})
        break
      }
    }
  }
  // Fallback: try to find any .walkRules result
  if(!r && base && base.walkRules) {
    base.walkRules(rule => {
      if(!r) r=rule.clone({selector,nodes:[]})
    })
  }
  // If we still can't, throw so dev is aware
  if(!r) throw new Error("Cannot create a new rule node (no base rule to clone)")
  return r
},
// Helper to create a declaration node based on an existing decl
makeDecl=(base,prop,value)=>{
  let d=null
  if(base && base.type==="decl") {
    d=base.clone({prop,value})
  }else if(base && base.walkDecls) {
    base.walkDecls(decl=>{if(!d) d=decl.clone({prop,value})})
  }
  if(!d) throw new Error("Cannot create a new declaration node (no base decl to clone)")
  return d
}
// remove empty rules recursively from a container (always runs)
const removeEmptyRules=(c,root)=>(c.nodes||[]).slice().forEach(n=>{
  if(n.type==='rule'&&(!n.nodes||n.nodes.length===0))n.remove()
  else if(n.type==='rule'||n.type==='atrule')removeEmptyRules(n,root)
})
// for rules like '.foo .bar', nest .bar inside .foo (no ampersand)
const nestDescendants=(c,root)=>{
  if(!c.nodes)return
  const toNest=[]
  c.nodes.forEach(r=>{
    if(r.type!=='rule')return
    if(splitSelectors(r.selector).some(s=>s.includes(' ')))toNest.push(r)
  })
  toNest.forEach(r=>{
    splitSelectors(r.selector).forEach(s=>{
      const parts=s.split(/\s+/)
      if(parts.length<2)return
      const pSel=parts.slice(0,-1).join(' ')
      const cSel=parts.slice(-1)[0]
      let p=null
      c.walkRules(rr=>{if(rr.selector===pSel&&rr.parent===c)p=rr})
      if(!p){p=makeRule(root,pSel);c.append(p)}
      let nested=null
      ;(p.nodes||[]).forEach(nn=>{if(nn.type==='rule'&&nn.selector===cSel)nested=nn})
      if(!nested){nested=makeRule(root,cSel);p.append(nested)}
      r.walkDecls(d=>nested.append(d.clone()))
    })
    r.remove()
  })
  ;(c.nodes||[]).forEach(n=>{if(n.type==='atrule'||n.type==='rule')nestDescendants(n,root)})
}
// factor out all property-value pairs shared by two or more sibling rules
const factorCommonProps=(c,root)=>{
  if(!c.nodes)return
  const rules=c.nodes.filter(n=>n.type==='rule')
  if(rules.length<2)return
  const propMap={}
  rules.forEach((r,i)=>{
    r.walkDecls(d=>{
      const k=declKey(d)
      if(!propMap[k])propMap[k]=[]
      propMap[k].push(i)
    })
  })
  const commonProps={}
  Object.entries(propMap).forEach(([k,is])=>{
    if(is.length<2)return
    const group=is.sort().join(',')
    if(!commonProps[group])commonProps[group]=[]
    commonProps[group].push(k)
  })
  Object.entries(commonProps).forEach(([idxs,keys])=>{
    const ids=idxs.split(',').map(Number)
    const sel=unique(ids.map(i=>rules[i].selector)).sort().join(', ')
    const newRule=makeRule(root,sel)
    keys.forEach(k=>{
      const [prop,...v]=k.split(':')
      newRule.append(makeDecl(root,prop,v.join(':')))
    })
    c.insertBefore(rules[ids[0]],newRule)
    ids.forEach(i=>{
      rules[i].walkDecls(d=>{if(keys.includes(declKey(d)))d.remove()})
    })
  })
  removeEmptyRules(c,root)
  c.nodes.forEach(n=>{if(n.type==='rule'||n.type==='atrule')factorCommonProps(n,root)})
}
// merge sibling rules with identical full blocks into one selector group
const collapseNestedSiblings=(c,root)=>(c.nodes||[]).forEach(p=>{
  if(p.type!=='rule')return
  const blockMap={}
  ;(p.nodes||[]).forEach(ch=>{
    if(ch.type!=='rule')return
    const set=[]
    ch.walkDecls(d=>set.push(declKey(d)))
    const key=JSON.stringify(set.sort())
    if(!blockMap[key])blockMap[key]=[]
    blockMap[key].push(ch)
  })
  Object.values(blockMap).forEach(g=>{
    if(g.length<2)return
    const sel=unique(g.flatMap(r=>splitSelectors(r.selector))).sort().join(', ')
    const newRule=makeRule(root,sel)
    g[0].walkDecls(d=>newRule.append(d.clone()))
    p.insertBefore(g[0],newRule)
    g.forEach(r=>r.remove())
  })
  collapseNestedSiblings(p,root)
})
// is sel2 a direct pseudo of sel1? (e.g. sel1='a', sel2='a:hover')
const isDirectPseudoOf=(s1,s2)=>{
  if(s2.startsWith(s1)&&s2.length>s1.length){
    const rest=s2.slice(s1.length)
    return /^:{1,2}[a-zA-Z\-\_]/.test(rest)
  }
  return false
}
// move pseudo rules under their base selector as &-prefixed nested rules
const nestPseudos=(root)=>{
  const process=(c)=>{
    const rules=(c.nodes||[]).filter(n=>n.type==='rule')
    rules.forEach(base=>{
      const baseSels=splitSelectors(base.selector)
      baseSels.forEach(s=>{
        // find rules that are all direct pseudos of s
        const pseudos=rules.filter(r=>
          r!==base&&splitSelectors(r.selector).every(sel=>isDirectPseudoOf(s,sel))
        )
        if(pseudos.length){
          pseudos.forEach(pr=>{
            const pseudoSels=splitSelectors(pr.selector).map(sel=>'&'+sel.slice(s.length))
            const nested=makeRule(root,pseudoSels.join(', '))
            pr.walkDecls(d=>nested.append(d.clone()))
            base.append(nested)
            pr.remove()
          })
        }
      })
    })
    ;(c.nodes||[]).forEach(n=>{
      if(n.type==='rule'||n.type==='atrule')process(n)
    })
  }
  process(root)
};
// plugin on main
const postcssNest=(opts={})=>({
  postcssPlugin:'postcss-nest',
  Once(root){
    const {
      nestDescendants:nd=true,
      collapseNestedSiblings:cs=true,
      factorCommonProps:fcp=true,
      nestPseudos:np=true
    }=opts||{}
    if(nd)nestDescendants(root,root)
    if(cs)collapseNestedSiblings(root,root)
    if(fcp)factorCommonProps(root,root)
    if(np)nestPseudos(root)
    // tidy up
    removeEmptyRules(root,root)
  }
})
postcssNest.postcss=true
export default postcssNest
