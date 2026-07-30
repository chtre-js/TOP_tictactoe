function createPlayer(name, marker) {
    function getName() {
        return name;
    }

    function getMarker() {
        return marker;
    }

    return {getName, getMarker}
}