-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `s9616_placements`
--

-- --------------------------------------------------------

--
-- Table structure for table `placements`
--

CREATE TABLE `placements` (
  `PID` int(11) NOT NULL,
  `PTitle` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PLink` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PLogo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PCompany` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PLocation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PDescription` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PDeadline` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PSalary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `PPosted` enum('0','1') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for table `placements`
--
ALTER TABLE `placements`
  ADD PRIMARY KEY (`PID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `placements`
--
ALTER TABLE `placements`
  MODIFY `PID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
