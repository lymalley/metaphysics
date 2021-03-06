import { resolve } from "path"
import { readFileSync } from "fs"
import { runAuthenticatedQuery } from "schema/v2/test/utils"
import gql from "lib/gql"
import { isEqual } from "lodash"

const gravityData = {
  id: "saved-artwork",
  name: "Saved Artwork",
  default: true,
  description: "",
  image_url: null,
  image_versions: null,
  private: false,
}

xdescribe("Collections", () => {
  describe("Handles getting collection metadata", () => {
    it("returns collection metadata", async () => {
      const query = `
        {
          collection(id: "saved-artwork") {
            name
            private
            default
          }
        }
      `
      const context = {
        collectionLoader: id =>
          id === "saved-artwork" && Promise.resolve(gravityData),
      }
      const data = await runAuthenticatedQuery(query, context)
      expect(data).toMatchSnapshot()
    })

    it("returns artworks for a collection", async () => {
      const query = gql`
        {
          collection(id: "saved-artwork") {
            artworksConnection(first: 10) {
              edges {
                node {
                  slug
                  title
                }
              }
            }
          }
        }
      `
      const artworksPath = resolve(
        "src",
        "test",
        "fixtures",
        "gravity",
        "artworks_array.json"
      )
      const artworks = JSON.parse(readFileSync(artworksPath, "utf8"))
      const context = {
        collectionLoader: () => Promise.resolve(gravityData),
        collectionArtworksLoader: (id, params) => {
          if (
            id === "saved-artwork" &&
            isEqual(params, {
              total_count: true,
              size: 10,
              offset: 0,
              private: false,
              sort: "-position",
            })
          ) {
            return Promise.resolve({
              body: artworks,
              headers: { "x-total-count": 10 },
            })
          }
        },
      }
      const data = await runAuthenticatedQuery(query, context)
      expect(data).toMatchSnapshot()
    })

    it("ignores errors from gravity and returns an empty collection instead", async () => {
      const query = gql`
        {
          collection(id: "saved-artwork") {
            artworksConnection(first: 10) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        }
      `
      const context = {
        collectionLoader: () => Promise.resolve(gravityData),
        collectionArtworksLoader: () =>
          Promise.reject(new Error("Collection Not Found")),
      }
      const {
        collection: {
          artworksConnection: { edges },
        },
      } = await runAuthenticatedQuery(query, context)
      expect(edges).toEqual([])
    })
  })
})
