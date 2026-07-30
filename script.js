function createPlayer(name, marker) {
    function getName() {
        return name;
    }

    function getMarker() {
        return marker;
    }

    return {getName, getMarker}
}

const gameboard = (function() {
    const board = new Array(9);

    function getBoard() {
        return [...board];
    }
    
    function setCell(index, marker) {
        if (board[index] !== null) {
            board.splice(index, 1, marker)
        }
    }

    function resetBoard() {
        board.fill(null);
    }
})();