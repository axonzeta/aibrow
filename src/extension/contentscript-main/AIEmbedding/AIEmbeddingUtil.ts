import {
  AIEmbeddingVector
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'

type AIEmbeddingVectorListItem = Array<{
  id: any
  vector: AIEmbeddingVector
}>

/* **************************************************************************/
// MARK: Comparison
/* **************************************************************************/

/**
 * Calculates the cosine similarity between two embeddings. Only compare embeddings created
 * by the same model
 * @param vectorA: the first embedding to compare
 * @param vectorB: the second embedding to compare
 * @return a value between 0 and 1 representing the similarity
 */
export function calculateCosineSimilarity (vectorA: AIEmbeddingVector, vectorB: AIEmbeddingVector): number {
  const vectorALen = vectorA.length
  const vectorBLen = vectorB.length

  if (vectorALen !== vectorBLen) {
    if (vectorALen === 0 || vectorBLen === 0) {
      return 0
    } else {
      throw new Error('Embeddings have different lengths')
    }
  }

  let dotProduct = 0
  let thisMagnitude = 0
  let otherMagnitude = 0
  for (let i = 0; i < vectorALen; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    thisMagnitude += Math.pow(vectorA[i], 2)
    otherMagnitude += Math.pow(vectorB[i], 2)
  }

  if (thisMagnitude === 0 && otherMagnitude === 0) {
    return 1
  } else if (thisMagnitude === 0 || otherMagnitude === 0) {
    return 0
  }

  const thisNorm = Math.sqrt(thisMagnitude)
  const otherNorm = Math.sqrt(otherMagnitude)

  return dotProduct / (thisNorm * otherNorm)
}

/**
 * Finds and sorts similar vectors
 * @param embeddings: the list of embeddings to search
 * @param target: the target vector to compare against
 * @returns a list of embedding ids sorted by similarity
 */
export function findSimilar (embeddings: AIEmbeddingVectorListItem, target: AIEmbeddingVector): any[] {
  const similarities = new Map<any, number>()
  for (const { id, vector } of embeddings) {
    similarities.set(id, calculateCosineSimilarity(vector, target))
  }

  return Array.from(similarities.keys()).sort((a, b) => (
    similarities.get(b)! - similarities.get(a)!
  ))
}
