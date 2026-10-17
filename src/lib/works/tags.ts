import { getCollection, type CollectionEntry } from "astro:content";
type Work = CollectionEntry<"works">;

const sortByPublishDateDesc = (a: Work, b: Work): number =>
  b.data.date.getTime() - a.data.date.getTime();

export const WORK_INDEX_PAGE_SIZE = 12;
export const WORK_TAGS_PAGE_SIZE = 12;

export const getWorks = async (): Promise<Work[]> => {
  const works = await getCollection("works");
  return works.sort(sortByPublishDateDesc);
};
