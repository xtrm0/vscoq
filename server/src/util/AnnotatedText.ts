import * as diff from 'diff';

import {ProofView, Goal, Hypothesis, AnnotatedText, HypothesisDifference, TextAnnotation, ScopedText, Substitution} from '../protocol';
export {ProofView, Goal, Hypothesis, AnnotatedText, HypothesisDifference, TextAnnotation, ScopedText} from '../protocol';


export interface Annotation {
  /** the relationship this text has to the text of another state */
  diff?: "added",
  /** what to display instead of this text */
  substitution?: string,
}

export function isScopedText(text: AnnotatedText): text is ScopedText {
  return text.hasOwnProperty('scope');
}

export function isTextAnnotation(text: AnnotatedText): text is TextAnnotation {
  return typeof (text as any).text === 'string'
}

export function textToString(text: AnnotatedText) : string {
  if(typeof text === 'string') {
    return text;
  } else if(text instanceof Array) {
    return text.map(textToString).join('');
  } else if(isScopedText(text)) {
    return textToString(text.text);
  } else {// TextAnnotation
    return textToString(text.text);
  }
}

export function textToDisplayString(text: AnnotatedText) : string {
  if(typeof text === 'string') {
    return text;
  } else if(text instanceof Array) {
    return text.map(textToDisplayString).join('');
  } else if(isScopedText(text)) {
    return textToString(text.text);
  } else if(text.substitution) {// TextAnnotation
    return textToDisplayString(text.substitution);
  } else{// TextAnnotation
    return text.substitution ? text.substitution : text.text;
  }
}

export function textLength(text: AnnotatedText) : number {
  if(typeof text === 'string') {
    return text.length;
  } else if(text instanceof Array) {
    return text.reduce((c,t) => c+textLength(t),0);
  } else if(isScopedText(text)) {
    return textLength(text.text);
  } else {// TextAnnotation
    return text.text.length;
  }
}

export function textDisplayLength(text: AnnotatedText) : number {
  if(typeof text === 'string') {
    return text.length;
  } else if(text instanceof Array) {
    return text.reduce((c,t) => c+textDisplayLength(t),0);
  } else if(isScopedText(text)) {
    return textDisplayLength(text.text);
  } else {// TextAnnotation
    return text.substitution ? text.substitution.length : text.text.length;
  }
}

export function copyAnnotation(x: Annotation) : Annotation {
  if(x.diff!==undefined && x.substitution!==undefined)
    return {diff: x.diff, substitution: x.substitution};
  if(x.diff!==undefined)
    return {diff: x.diff};
  if(x.substitution!==undefined)
    return {substitution: x.substitution};
  else
    return {};
}


function mapAnnotationInternal(text: AnnotatedText, map: (text: string, annotation: Annotation, start: number, displayStart: number) => AnnotatedText, currentOffset: number, currentDisplayOffset: number) : {text: AnnotatedText, endOffset: number, endDisplayOffset: number } {
  if(typeof text === 'string') {
    const result = map(text,{},currentOffset,currentDisplayOffset);
    return {text: result, endOffset: currentOffset + textLength(result), endDisplayOffset: currentDisplayOffset + textDisplayLength(result)};
  } else if(text instanceof Array) {
    const results : (string|TextAnnotation|ScopedText)[] = []; 
    for(let txt of text) {
      const newText = mapAnnotationInternal(txt,map,currentOffset,currentDisplayOffset);
      currentOffset = newText.endOffset;
      currentDisplayOffset = newText.endDisplayOffset;
      if(newText.text instanceof Array)
        results.push(...newText.text); 
      else
        results.push(newText.text); 
    }
    return {text: results, endOffset: currentOffset, endDisplayOffset: currentDisplayOffset};
  } else if(isScopedText(text)) {
    const result = mapAnnotationInternal(text.text,map,currentOffset,currentDisplayOffset);
    return {text: {scope: text.scope, text: result.text}, endOffset: result.endOffset, endDisplayOffset: result.endDisplayOffset};
  } else {// TextAnnotation
    const newText = map(text.text,copyAnnotation(text),currentOffset,currentDisplayOffset);
    return {text: newText, endOffset: currentOffset + textLength(newText), endDisplayOffset: currentDisplayOffset + textDisplayLength(newText)};
  }
}

export function mapAnnotation(text: AnnotatedText, map: (text: string, annotation: Annotation, start: number, displayStart: number) => AnnotatedText) {
  return mapAnnotationInternal(text,map,0,0).text;
}

/**
 * Substitutions are compatible if either:
 * 1) neither has a substitution or
 * 2) both have substitutions and one will be substituted with ""
 */
export function compatibleAnnotations(ann1: Annotation, ann2: Annotation) : boolean {
  return ann1.diff === ann2.diff && ((ann1.substitution === undefined && ann2.substitution === undefined) || (ann1.substitution === "" || ann2.substitution === ""))
}

function concatText(text1: AnnotatedText, text2: AnnotatedText) : AnnotatedText {
  if(typeof text1 === 'string' && typeof text2 === 'string')
    return [text1 + text2];
  else if(text1 instanceof Array)
    return text1.concat(text2)
  else if(text2 instanceof Array)
    return [text1, ...text2]
  else
    return [text1,text2]
}

function tryCombineText(text1: string|TextAnnotation|ScopedText, text2: string|TextAnnotation|ScopedText) : string|TextAnnotation|ScopedText|undefined {
  if(typeof text1 === 'string' && typeof text2 === 'string')
    return text1 + text2;
  else if(isScopedText(text1) && isScopedText(text2) && text1.scope === text2.scope)
    return {scope: text1.scope, text: normalizeText(concatText(text1.text,text2.text))};
  else if(isTextAnnotation(text1) && isTextAnnotation(text2) && compatibleAnnotations(text1,text2))
    return {diff: text1.diff, substitution: text1.substitution||text2.substitution, text: text1.text+text2.text};
  else
    return undefined
}

export function normalizeTextAnnotationOrString(text: TextAnnotation|string) : TextAnnotation|string {
  if(typeof text === 'string') {
    return text;
  } else {// TextAnnotation
    let count = 0;
    for(let key in text) {
      if(text.hasOwnProperty(key) && key!='text' && text[key] !== undefined)
        ++count;
    }
    if(count > 0) // has annotations
      return text;
    else
      return text.text
  }
}

export function normalizeText(text: AnnotatedText) : AnnotatedText {
  if(typeof text === 'string') {
    return text;
  } else if(text instanceof Array) {
    if(text.length === 0)
      return "";

    const results : (string|TextAnnotation|ScopedText)[] = [];
    const norm = normalizeText(text[0]);
    if(norm instanceof Array)
      results.push(...norm);
    else
      results.push(norm);

    for(let idx = 1; idx < text.length; ++idx) {
      const norm = normalizeText(text[idx]);
      if(norm instanceof Array) {
        if(norm.length === 0)
          continue;
        let first = norm.shift();
        const merge = tryCombineText(results[results.length-1], first);
        if(merge)       
          results[results.length-1] = merge;
        else
          results.push(merge);
        results.push(...norm);
      } else {
        const merge = tryCombineText(results[results.length-1], norm);
        if(merge)       
          results[results.length-1] = merge;
        else
          results.push(norm);
      }
    }
    if(results.length === 1)
      return results[0];
    else
      return results;
  } else if(isScopedText(text)) {
    const norm = normalizeText(text.text);
    if(text.scope === "" || norm === "")
      return norm;
    else
      return {scope: text.scope, text: norm};
  } else {// TextAnnotation
    let count = 0;
    for(let key in text) {
      if(text.hasOwnProperty(key) && key!='text' && text[key] !== undefined)
        ++count;
    }
    if(count > 1) // has annotations
      return text;
    else
      return text.text
  }
}

export function combineAnnotationText(text: TextAnnotation|string, baseAnn: Annotation) : TextAnnotation|string {
  let result : TextAnnotation;
  if(typeof text === 'string')
    result = Object.assign(copyAnnotation(baseAnn), {text:text});
  else
    result = Object.assign(copyAnnotation(baseAnn), text);
  for(let key in result) {
    if(result[key] === undefined)
      delete result[key]
  }
  return normalizeTextAnnotationOrString(result);
}

function annotateDiff(text: AnnotatedText, differences: diff.IDiffResult[], diffSubstitutions: boolean) : AnnotatedText {
  let idx = 0; // the current diff
  let offset = 0; // position of current diff w.r.t. textToString() (not textToDisplayString())
  let diffOffset = 0; // the offset into the current diff; used when a diff spans multiple text parts
  const result = mapAnnotation(text, (plainText, annotation, startOffset, startDisplayOffset) => {
    let text: string;
    let start: number;
    let doSubst = false;
    if(annotation.substitution && diffSubstitutions) {
      text = annotation.substitution;
      start = startDisplayOffset;
      doSubst = true;
    } else {
      text = plainText;
      start = startOffset;
    }

    if(offset+diffOffset != start)
      throw "invalid diff: does not line up with text position";

    const parts: (TextAnnotation|string)[] = [];
    for(; idx < differences.length && offset+differences[idx].value.length <= start + text.length; ++idx) {
      const diff = differences[idx];
      if(diff.removed) {
        diffOffset = 0;
        continue;
      }
      if(doSubst) {
        parts.push(combineAnnotationText({ text: plainText
          , substitution: diff.value.substr(diffOffset)
          , diff: diff.added ? "added" : undefined
          }, annotation));
        plainText = ""; // remaining parts will have empty text
      } else
        parts.push(combineAnnotationText({text: diff.value.substr(diffOffset), diff: diff.added ? "added" : undefined},annotation))
      offset+= diff.value.length - diffOffset;
      // In case we are breaking a substitution into multiple parts,
      // we only want the first part to apply the full substitution;
      // the rest will be substituted with the empty string
      if(annotation.substitution)
        annotation.substitution = "";

      diffOffset = 0;
    }

    while(idx < differences.length && differences[idx].removed)
      ++idx;

    // The diff spans this text and the next; add the *this* part
    if(idx < differences.length && offset < start+text.length) {
      // ASSUME: offset+differences[idx].value.length > start+text.length
      // I.E. ASSUME: current-diff-end extends beyond text

      if(doSubst) {
        parts.push(combineAnnotationText(
          { text: plainText
          , substitution: text.substring(offset+diffOffset-start)
          , diff: differences[idx].added ? "added" : undefined
          }, annotation));
      } else
        parts.push(combineAnnotationText({text: text.substring(offset+diffOffset-start), diff: differences[idx].added ? "added": undefined},annotation))
      // NOTE: do not advance idx or offset, but advance diffOffset
      diffOffset+= text.length + start - offset - diffOffset;
    }

    // The diffs *should* be 
    if(idx > differences.length && offset < start+text.length)
      throw "invalid diff: does not line up with text length";

    if(parts.length === 0)
      return "";
    else if(parts.length === 1)
      return parts[0];
    else
      return parts;
  });
  return result;
}

export function diffText(oldText: AnnotatedText, newText: AnnotatedText) : {text: AnnotatedText, different: boolean} {
  if(!oldText)
    return {text: newText, different: false};
  const difference = diff.diffWords(textToDisplayString(oldText), textToDisplayString(newText));
  return {text: annotateDiff(newText, difference, true), different: difference.length > 1 }
}
