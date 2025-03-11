package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"

	f "github.com/kirtansoni/words-weave/internal/frontend"
	g "github.com/kirtansoni/words-weave/internal/game"
)

var (
	addr    = flag.String("addr", ":8080", "Port of the server")
	logfile = flag.String("logfile", "logs/app.logs", "set Logfile")
)

func InitalizeLogging(filename string) *os.File {
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal(err)
	}
	log.SetOutput(file)
	return file
}

func main() {
	flag.Parse()
	file := InitalizeLogging(*logfile)
	defer file.Close()
	ctx := context.Background()
	game := g.GetGame()
	game.Init(ctx)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", f.GetReactSPA().ServeHTTP)
	mux.HandleFunc("GET /game", game.Getgamestate)
	mux.HandleFunc("POST /game", game.Postgamestate)

	// starting server
	log.Println("Starting Server at " + *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal("Server failed:", err)
	}
}
