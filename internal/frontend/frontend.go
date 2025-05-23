package frontend 

import (
	"embed"
	"io/fs"
	"net/http"
)

var (
	reactPath = "reactbuild"
	//go:embed  reactbuild
	reactDist embed.FS
	instance *ReactSPA = &ReactSPA{
		buildDir:   reactPath,
		embeddings: reactDist,
	}
)

type ReactSPA struct {
	embeddings embed.FS
	buildDir   string
}

func GetReactSPA() *ReactSPA {
	return instance
}

func (a *ReactSPA) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	dist, err := fs.Sub(a.embeddings, a.buildDir)
	if err != nil {
		http.Error(w, "Error accessing embedded files: "+err.Error(), http.StatusInternalServerError)
		return
	}
	fs := http.FileServer(http.FS(dist))
	fs.ServeHTTP(w, r)
}