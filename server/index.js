const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, '../client/build')));

let seatsData = {
  availableSeats: 80,
  reservedSeats: [],
};

const dbFilePath = './data/db.json';

// Read data from the JSON file on startup
if (fs.existsSync(dbFilePath)) {
  const data = fs.readFileSync(dbFilePath);
  seatsData = JSON.parse(data);
}

const saveDataToDb = () => {
  fs.writeFileSync(dbFilePath, JSON.stringify(seatsData, null, 2));
};

app.get('/api/available-seats', (req, res) => {
  res.json(seatsData);
});

app.get('/api/reserve-seats-data', (req, res) => {
  let seatNumber = 1;
  let seatsPerRow = 7;
  let seats = [];
  let totalSeats = 80;
  while (seatNumber <= totalSeats) {
    const row = [];
    for (let i = 0; i < seatsPerRow; i++) {
      if (seatNumber <= totalSeats) {
        row.push({ number: seatNumber, isAvailable: isSeatNumberReserved(seatNumber) ? false : true });
        seatNumber++;
      }
    }
    seats.push(row);
  }
  res.json(seats);
});

app.post('/api/reserve-seats', (req, res) => {
  // const { numSeats, userName } = req.body;
  const { numSeats } = req.body;

  if (numSeats <= 0) {
    return res.status(400).json({ message: 'Invalid number of seats.' });
  }

  if (numSeats > 7) {
    return res.status(400).json({ message: 'Maximum 7 seats can be reserved at a time.' });
  }

  if (numSeats > seatsData.availableSeats) {
    return res.status(400).json({ message: 'Not enough available seats.' });
  }

  const reservedSeats = [];
  // const reservationId = Date.now(); // Unique reservation ID based on timestamp // userName
  const reservationId = generateReservationId();
  // Check if booking in one row is possible
  let seatNumber = seatsData.availableSeats;
  if (seatNumber % 10 >= numSeats) {
    for (let i = 0; i < numSeats; i++) {
      reservedSeats.push({ seatNumber: seatNumber - i, reservationId });
      seatsData.availableSeats -= 1;
    }
  } else {
    // If booking in one row is not possible, book nearby seats
    for (let i = 0; i < numSeats; i++) {
      if (seatsData.availableSeats === 0) {
        break; // No more seats available
      }

      seatNumber = Math.max(1, seatNumber - i);
      reservedSeats.push({ seatNumber, reservationId });
      seatsData.availableSeats -= 1;
    }
  }

  seatsData.reservedSeats = seatsData.reservedSeats.concat(reservedSeats);
  // seatsData.availableSeats -= numSeats;

  saveDataToDb();

  const seatNumbers = reservedSeats.map(seat => seat.seatNumber);
  res.json({ message: `${numSeats} seat(s) reserved successfully. Reservation ID / PNR : ${reservationId} and Seat number(s): ${seatNumbers.join(', ')}`});
});

// Function to generate a 10-digit reservation ID based on the timestamp
const generateReservationId = () => {
  const timestamp = Date.now().toString(); // Convert timestamp to string
  const reservationId = timestamp.substring(timestamp.length - 10); // Take last 10 digits
  return reservationId;
};

const isSeatNumberReserved = (seatNumber) => {
  return seatsData.reservedSeats.some(reservedSeat => reservedSeat.seatNumber === seatNumber);
};

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

